# Guide du back-office

Pour gérer la boutique de Maranatha Le Juste Prix.
Adresse : **votre-site.com/admin**

---

## Mettre tout votre stock en ligne

Vous avez beaucoup d'articles. Il y a trois manières de les publier —
choisissez selon ce que vous avez sous la main.

### Vous avez un fichier Excel ou un tarif de fournisseur

C'est la voie la plus rapide : des milliers d'articles en quelques
minutes.

**Menu → Import en lot**

1. **Déposez le fichier.** Excel (.xlsx) ou CSV. Glissez-le dans le
   cadre, ou cliquez pour le choisir.

2. **Vérifiez les colonnes.** Le site lit les en-têtes de votre fichier
   et devine à quoi chaque colonne correspond : `Désignation` → le nom,
   `P.U. de vente` → le prix, `Qté en stock` → le stock. Il se trompe
   rarement, mais regardez quand même la liste : si une colonne est mal
   placée, corrigez-la avec le menu déroulant.

   *Une colonne qui ne vous sert pas ? Laissez « non utilisée ». Elle
   sera simplement ignorée.*

3. **Lisez l'aperçu.** Il vous dit, avant d'écrire quoi que ce soit :
   combien d'articles seront créés, combien seront mis à jour, et
   quelles lignes posent problème — un prix illisible, un nom manquant,
   une référence en double. Les lignes à problème sont montrées en
   premier.

4. **Appliquez.** Les articles arrivent en **brouillon** : ils ne sont
   pas encore visibles par vos clients. Vous les relisez tranquillement,
   puis vous les publiez tous d'un coup.

> **Le point important : la référence.**
> C'est le code de l'article (`RIZ-25KG`, `CIM-50KG`). Si vous redéposez
> plus tard un fichier contenant la même référence, la fiche est **mise
> à jour** au lieu d'être créée en double.
>
> C'est ce qui vous permet de redéposer le tarif de votre fournisseur
> chaque mois : seuls les prix et les stocks changent, rien ne se
> duplique.

**Votre fournisseur envoie toujours le même format ?** Après avoir réglé
les colonnes, cliquez sur « Enregistrer cette correspondance » et
donnez-lui son nom. Au prochain envoi, vous la réappliquez d'un clic.

**Vous n'avez pas de fichier ?** Téléchargez le modèle (bouton en haut
de la page). Il est déjà rempli avec vos rayons et deux exemples.
Remplissez-le dans Excel, et redéposez-le.

---

### Vous tapez les articles à la main

**Menu → Saisie rapide**

Une seule ligne : le nom, le rayon, le prix, le stock. Vous tapez,
**Entrée**, et c'est enregistré — le curseur revient au nom, prêt pour
le suivant. Le rayon et l'unité restent d'une ligne à l'autre, vous ne
les retapez pas.

Pour une centaine d'articles, c'est la méthode la plus simple.

---

### Vous voulez soigner une fiche

**Menu → Articles → Nouvel article**, ou cliquez sur un article
existant.

Tout y est : description, marque, origine, prix d'achat (pour voir votre
marge), poids, photos, seuil d'alerte.

---

## Ajouter les photos

**Menu → Photos en lot**

C'est là qu'on gagne le plus de temps. Vous déposez **toutes vos photos
d'un coup** — deux cents s'il le faut — et chacune rejoint son article
toute seule.

**Comment ? Par le nom du fichier.**

| Nom du fichier | Résultat |
|---|---|
| `RIZ-25KG.jpg` | photo principale de l'article RIZ-25KG |
| `RIZ-25KG-2.jpg` | deuxième photo du même article |
| `RIZ-25KG-3.jpg` | troisième photo |

La photo numéro 1 est celle qui s'affiche en vitrine.

Renommez vos photos avant de les déposer, et tout se range seul. Celles
qui ne correspondent à aucun article vous sont signalées en haut de la
liste, avec la raison — vous corrigez le nom et vous les redéposez.

> Les photos sont **réduites sur votre appareil avant l'envoi**. Une
> photo de téléphone de 5 Mo part à environ 300 Ko. C'est la différence
> entre un dépôt de deux minutes et un dépôt d'une demi-heure quand la
> connexion est lente.

La page vous montre aussi la liste des articles qui attendent encore une
photo. Le bouton « Copier les références » vous met cette liste dans le
presse-papiers : pratique pour préparer une séance photo.

---

## Modifier beaucoup d'articles d'un coup

**Menu → Articles**

### Corriger un prix ou un stock

Les colonnes **Prix** et **Stock** se modifient directement dans le
tableau. Cliquez dans la case, tapez la nouvelle valeur, **Entrée** : la
modification est enregistrée et le curseur descend à la ligne suivante.

Vous pouvez écrire `12 500`, `12500` ou `12.500` — tout est compris.

### Agir sur une sélection

1. Cochez les articles. *(Maj + clic coche toute une série.)*
2. Une barre noire apparaît en bas.

Elle permet de : **publier**, repasser en **brouillon**, changer les
**prix**, les **stocks**, le **rayon**, **archiver** ou **supprimer**.

**Pour agir sur des milliers d'articles :** cochez la case en haut du
tableau, puis cliquez sur « Sélectionner les N articles du filtre ». La
sélection porte alors sur **tout ce que votre recherche a trouvé**, pas
seulement sur la page affichée.

> Exemple : vous voulez augmenter tous les matériaux de construction de
> 5 %. Choisissez le rayon « Matériaux de construction », sélectionnez
> tout le filtre, cliquez sur **Prix**, choisissez « Augmenter d'un
> pourcentage », tapez `5`. C'est fait.

Les prix sont arrondis au franc. Pour obtenir des prix ronds,
utilisez ensuite « Arrondir au multiple de » avec `100` ou `500`.

### Les onglets du haut

Ils vous montrent ce qui demande attention :

- **En rupture** — articles en ligne dont le stock est à zéro
- **Stock bas** — sous leur seuil d'alerte
- **Sans photo** — en ligne mais sans image (ça se vend mal)
- **Sans prix** — à 0 franc, donc impubliables

---

## Les commandes

**Menu → Commandes**

Par défaut, vous voyez celles **à traiter**. Cliquez sur une commande
pour l'ouvrir.

### Ce qu'on fait sur une commande

- **Confirmer** quand vous avez parlé au client et que la commande est
  ferme.
- **Marquer préparée** quand le colis est prêt.
- **Partie en livraison** quand elle est en route.
- **Marquer livrée** quand le client l'a reçue.

Les boutons ne proposent que l'étape suivante : pas d'erreur possible.

**Écrire sur WhatsApp** ouvre une conversation avec le client, avec le
récapitulatif de sa commande déjà écrit. Vous n'avez qu'à envoyer.

**Imprimer** sort un bon propre, avec l'en-tête de la maison, à glisser
dans le colis ou à garder.

**Annuler** remet automatiquement les articles en stock. Rien à
rattraper à la main.

### Le paiement

Le menu « Marquer le paiement » sert aux règlements que vous recevez
vous-même : espèces à la livraison, paiement au comptoir. Passez-le sur
« Payée » quand l'argent est entré.

---

## Le tableau de bord

**Menu → Tableau de bord**

En haut, les chiffres du jour et des trente derniers jours : chiffre
d'affaires, panier moyen, commandes à traiter.

En dessous :

- **Ventes jour par jour** — les commandes annulées n'y sont jamais
  comptées. Ce que vous voyez est réel.
- **Dernières commandes** — pour entrer directement dans une commande.
- **Stock à surveiller** — ce qui se vend et dont le stock ne suivra
  pas. C'est votre liste de réapprovisionnement.
- **Les plus vendus** et **Par rayon** — ce qui marche.

Les pastilles en haut de page vous disent ce qui mérite votre attention
tout de suite : commandes en attente, ruptures, articles sans photo.

---

## Les réglages

**Menu → Réglages**

- **Accepter les commandes** — décochez pendant un inventaire ou une
  fermeture. Le catalogue reste visible, mais on ne peut plus commander.
- **Zones de livraison** — un nom, un forfait. Le client choisit sa zone
  et voit le montant **avant** de valider.
- **Livraison offerte à partir de** — mettez 0 pour ne jamais l'offrir.
- **Moyens de paiement** — ce que le client peut choisir.
- **Numéro WhatsApp** — celui qui reçoit les commandes.

---

## Quelques règles que le site tient pour vous

**Le prix affiché est le prix payé.** Aucun frais n'est ajouté entre le
panier et la caisse. La livraison, quand elle s'applique, est annoncée
avant la validation. C'est écrit sur chaque fiche article et sur chaque
confirmation de commande.

**Le stock ne ment pas.** Chaque vente le décrémente, chaque annulation
le rend. Un article épuisé est marqué épuisé, et on ne peut pas le
commander.

**Rien n'est écrit sans que vous l'ayez vu.** L'import montre toujours
l'aperçu avant d'écrire. Les articles importés arrivent en brouillon.

---

## En cas de souci

**« Le fichier n'a pas pu être lu »** — Si c'est un vieux fichier `.xls`,
ouvrez-le dans Excel et faites « Enregistrer sous » en `.xlsx` ou `.csv`.

**Les accents sont bizarres dans l'aperçu** — Le site vous le signale
lui-même. Vérifiez les quelques lignes de l'aperçu ; si c'est illisible,
réenregistrez le fichier depuis Excel en « CSV UTF-8 ».

**Une photo n'a pas trouvé son article** — Le nom du fichier ne
correspond à aucune référence. La liste vous indique la référence
cherchée. Renommez et redéposez.

**J'ai supprimé un article par erreur** — La suppression est définitive.
Pour retirer un article de la vente sans le perdre, utilisez
**Archiver** : il disparaît de la boutique mais reste dans votre
catalogue.

**J'ai oublié mon mot de passe** — Demandez à la personne qui s'occupe
du serveur : elle peut en créer un nouveau en une commande.
