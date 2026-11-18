# Maranatha Le Juste Prix — site, boutique et back-office

Site vitrine, boutique en ligne et back-office de gestion, dans un seul
projet Astro. Français, francs CFA, pensé pour une connexion mobile
camerounaise et pour un catalogue qui se publie par milliers d'articles.

---

## Ce que contient le projet

| Partie | Adresse | Rendu |
|---|---|---|
| Site vitrine | `/`, `/activites`, `/carnet`… | statique, pré-généré |
| Boutique | `/boutique`, `/boutique/<article>` | serveur |
| Panier et caisse | `/panier`, `/commande` | serveur |
| Back-office | `/admin` | serveur, protégé |

Les pages vitrine restent pré-générées : elles ne touchent pas la base et
se servent instantanément. Seules la boutique et le back-office sont
calculés à la demande.

---

## Architecture

```
Astro 7 (output: static + adapter node)
├── SQLite (better-sqlite3) + Drizzle ORM     une base = un fichier
├── sharp                                     photos → WebP 400/800/1600
├── Stockage photos : disque ou Cloudflare R2 au choix, même interface
├── Sessions maison (scrypt + cookie)         aucun service externe
└── CinetPay (optionnel)                      MTN MoMo, Orange Money
```

**Pourquoi SQLite.** Une seule boutique, un seul serveur. La base tient
dans un fichier : la sauvegarde est une copie, la restauration aussi.
En mode WAL, les lectures ne bloquent pas les écritures, et un import de
5 000 lignes passe en une transaction — c'est ce qui le rend quasi
instantané. Le passage à PostgreSQL resterait possible : l'accès aux
données est isolé dans `src/lib/repo/`.

**Pourquoi des sessions maison.** Le back-office doit rester accessible
même quand la liaison vers l'extérieur est mauvaise. Pas de fournisseur
d'identité tiers, pas de dépendance réseau pour se connecter.

### Les dossiers

```
src/
├── lib/
│   ├── db/schema.ts        tables et types
│   ├── repo/               accès aux données (produits, commandes, chiffres)
│   ├── import/             moteur de publication en lot
│   ├── payments/           moyens de paiement, CinetPay
│   ├── auth.ts             mots de passe, sessions, limitation des tentatives
│   ├── images.ts           traitement des photos
│   ├── money.ts            francs CFA : lecture et affichage
│   └── cart.ts             panier (cookie)
├── pages/
│   ├── admin/              back-office
│   ├── boutique/           catalogue public
│   └── api/                points d'entrée JSON
├── scripts/                code navigateur
└── styles/
    ├── global.css          système du site (existant)
    ├── shop.css            boutique
    └── admin.css           back-office
```

---

## Démarrer en local

```bash
npm install
cp .env.example .env          # puis compléter SESSION_SECRET
npm run dev
```

Créer un accès au back-office :

```bash
npm run compte -- patronne@exemple.cm "La patronne" "un-mot-de-passe-long"
```

Remplir avec un catalogue d'essai :

```bash
npm run demo          # 20 articles, 26 commandes
```

Le back-office est sur <http://localhost:4321/admin>.

### Commandes utiles

```bash
npm run check         # vérification des types (doit rester à zéro erreur)
npm run build         # construction
npm run etat          # ce que contient la base
npm run sauvegarde    # copie de la base, à chaud
node scripts/outil.mjs vider-demo
```

---

## Mise en production

```bash
cp .env.example .env          # compléter, surtout SESSION_SECRET
docker compose up -d --build
```

Deux conteneurs : `app` (Node) et `web` (nginx, en façade). nginx sert
les photos du catalogue depuis le volume et transmet le reste.

### Le volume `donnees`

Tout ce qui ne doit pas disparaître :

```
/data
├── maranatha.db        base
├── maranatha.db-wal    journal
├── uploads/            photos produits, en WebP
└── imports/            fichiers déposés, le temps du traitement
```

### Sauvegarde

```bash
docker compose exec app node scripts/outil.mjs sauvegarde /data/sauvegardes/jour.db
docker compose cp app:/data/sauvegardes/jour.db ./
docker compose cp app:/data/uploads ./uploads-sauvegarde
```

`sauvegarde` copie la base à chaud, sans arrêter le serveur.

**Si les photos sont sur le disque**, copier aussi `uploads/` : la base
ne contient pas les photos, seulement leurs noms. **Si elles sont sur
R2**, le bucket est déjà répliqué par Cloudflare et seule la base doit
être sauvegardée — mais elle, impérativement.

Une tâche quotidienne suffit :

```cron
0 2 * * * cd /srv/maranatha && docker compose exec -T app node scripts/outil.mjs sauvegarde
```

### Certificat TLS

nginx écoute en clair sur le port 80. Pour le HTTPS, placer certbot
devant, ou ajouter un bloc `listen 443 ssl` dans `nginx.conf` avec les
certificats montés.

---

## Les photos du catalogue

Deux pilotes derrière la même interface (`src/lib/storage.ts`). Le reste
du code ne sait pas lequel tourne.

**Disque** (par défaut). Rien à configurer. Les rendus vont dans
`DATA_DIR/uploads`, nginx les sert depuis le volume. Suffisant pour une
boutique, mais le volume devient indispensable à la sauvegarde.

**Cloudflare R2** (dès que les variables `R2_*` sont renseignées). Les
rendus partent dans un bucket et sont servis par le réseau de
Cloudflare : ils ne passent plus par le serveur, l'egress est gratuit,
et ils survivent à un redéploiement même sans volume.

L'installation actuelle écrit dans le bucket partagé `mbokofit`, sous le
dossier `maranatha/`, servi par `https://exercices.mbokofit.com`. Le
bucket héberge déjà `bbo/` et `exercises/` — un dossier par projet.

```
maranatha/<reference>-<suffixe>-<largeur>.webp
```

Le suffixe est unique, donc le cache est posé à un an en `immutable`.
Rien n'est jamais réécrit : une photo remplacée reçoit un nouveau nom.

**Pour basculer une boutique qui tourne déjà**, renseigner les `R2_*`
puis lancer une fois :

```bash
node scripts/outil.mjs photos-vers-r2          # essai à blanc
node scripts/outil.mjs photos-vers-r2 --vrai   # envoi réel
```

Rien n'est supprimé du disque. Les anciens liens `/media/...` renvoient
en 301 vers le CDN, donc aucune page ne casse pendant la bascule.

**Un domaine propre.** `R2_PUBLIC_URL` est la seule chose à changer pour
servir les images depuis `images.maranatha-le-juste-prix.com` plutôt que
depuis le domaine de MbokoFit : lier le domaine au bucket dans le
tableau de bord Cloudflare (R2 → Settings → Custom Domains), puis
remplacer la variable. Aucun changement de code, et les clés restent
identiques.

> Le jeton d'API Cloudflare en place est limité à R2 : il ne voit aucune
> zone DNS, donc il ne peut ni créer un enregistrement ni lier un
> domaine. Cette étape se fait à la main dans le tableau de bord.

---

## Configuration

Tout est dans `.env` (voir `.env.example`).

| Variable | Rôle |
|---|---|
| `SESSION_SECRET` | **Obligatoire.** Signe les sessions. Sans elle, tout le monde est déconnecté à chaque redémarrage. |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | Crée le premier compte au démarrage, s'il n'en existe aucun. Mot de passe à changer à la première connexion. |
| `DATA_DIR` | Où vivent la base et les photos. `/data` en conteneur. |
| `DELIVERY_FEE`, `FREE_DELIVERY_FROM` | Valeurs de départ, ensuite réglables dans le back-office. |
| `R2_*` | Photos sur Cloudflare R2. Toutes vides : les photos restent sur le disque. |
| `CINETPAY_*` | Paiement mobile. Inactif tant que `CINETPAY_ENABLED=false`. |
| `WHATSAPP_NUMBER` | Numéro qui reçoit les commandes WhatsApp. |
| `PUBLIC_URL` | Adresse publique, pour les retours de paiement. |

Générer une clé de session :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Paiement mobile

La boutique fonctionne **sans** : paiement à la livraison et paiement en
boutique sont actifs par défaut, et ce sont les plus utilisés ici.

Pour encaisser par MTN Mobile Money et Orange Money : ouvrir un compte
marchand CinetPay, renseigner `CINETPAY_SITE_ID`, `CINETPAY_API_KEY` et
`CINETPAY_SECRET_KEY`, passer `CINETPAY_ENABLED=true`, puis activer
« Mobile Money » dans Réglages.

L'adresse de notification à déclarer chez CinetPay :
`https://<votre-domaine>/api/boutique/paiement`

> Le statut d'un paiement n'est jamais lu dans la notification reçue :
> le serveur rappelle l'API de CinetPay pour le vérifier. Une
> notification peut être rejouée ou forgée.

---

## La publication en lot

C'est le cœur du back-office. Un catalogue de plusieurs milliers
d'articles se publie en trois gestes.

**1. Import de fichier** (`/admin/import`)
Excel ou CSV. Les en-têtes sont reconnus seuls — `Désignation`,
`P.U. de vente`, `Qté en stock`, `Prix d'achat`… — et la correspondance
reste modifiable. Les exports Excel français (point-virgule,
Windows-1252) sont lus correctement, accents compris. Les montants
`19 000 FCFA`, `11 250,00` et `6750` sont tous compris.

Rien n'est écrit avant l'aperçu : il annonce combien d'articles seront
créés, combien mis à jour, et liste les lignes à problème. L'écriture se
fait ensuite par paquets de 250, sans bloquer la boutique.

La **référence** est la clé : un même code met la fiche à jour au lieu
d'en créer une seconde. Redéposer le fichier du fournisseur chaque mois
n'actualise donc que les prix et les stocks.

La correspondance de colonnes s'enregistre sous un nom, pour être
réappliquée au prochain envoi du même fournisseur.

**2. Photos en lot** (`/admin/photos`)
On dépose deux cents photos d'un coup. Chacune rejoint son article
d'après le nom du fichier : `RIZ-25KG.jpg`, puis `RIZ-25KG-2.jpg` pour
la deuxième vue. Les photos sont réduites **dans le navigateur** avant
l'envoi — une photo de téléphone de 5 Mo part à environ 300 Ko, ce qui
change tout sur une connexion mobile.

**3. Actions en lot** (`/admin/produits`)
Prix et stocks se modifient directement dans le tableau : on tape,
Entrée, et le curseur descend d'une ligne. La sélection peut porter sur
tout un filtre — « les 3 000 articles qui correspondent à ma
recherche » — pour publier, changer un rayon, appliquer une remise ou
arrondir les prix en une fois.

---

## Points de vigilance

**Casse des colonnes.** `better-sqlite3` rend les colonnes telles
qu'elles sont en base (`track_stock`), alors que les types Drizzle sont
en casse mixte (`trackStock`). Mélanger les deux produit un `undefined`
silencieux. Partout où une requête brute est utilisée, les colonnes sont
sélectionnées explicitement et traduites — voir `toSaleLine()` dans
`src/lib/repo/orders.ts`.

**Sous-requêtes corrélées.** Le constructeur de requêtes ne qualifie pas
les colonnes dans une sous-requête : `${table.col}` devient `"col"`, ce
qui compare la colonne à elle-même. Ces sous-requêtes écrivent donc
leurs noms de tables en toutes lettres.

**Le stock se décrémente une seule fois.** La colonne `stock_applied`
d'une commande dit si le prélèvement a eu lieu. Une annulation rend le
stock et remet le drapeau à zéro ; une réouverture le reprend.

**Le `.env` n'est pas lu tout seul.** Astro expose `.env` sur
`import.meta.env`, pas sur `process.env`. `src/lib/env.ts` le charge
donc lui-même au démarrage, sans écraser ce qui vient déjà de
l'environnement : en production c'est le conteneur qui décide, jamais un
fichier oublié dans l'image.

**Les montants sont des entiers.** Le franc CFA ne se divise pas. Aucun
flottant, aucun arrondi caché : le prix affiché est le prix payé, et le
code le tient.

---

## Sécurité

- Mots de passe : scrypt (N=16384), sel par compte, comparaison à temps
  constant.
- Sessions : seul le condensé du jeton est stocké ; cookie `HttpOnly`,
  `SameSite=Lax`, `Secure` en production.
- Connexion : 8 tentatives par quart d'heure, puis blocage. Temps de
  réponse identique que le compte existe ou non.
- `/admin` : `no-store` et `noindex` sur chaque réponse.
- Photos : seuls les rendus générés sont servis, par un nom contrôlé.
  Aucune sortie du dossier possible.
- Les prix d'une commande sont toujours relus en base. Le navigateur
  n'envoie que des identifiants et des quantités.

`npm audit` signale des alertes sur `picomatch`, par la chaîne de Vite.
Elles concernent l'outillage de construction, pas le serveur en
production, et attendent un correctif en amont.
