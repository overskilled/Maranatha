/* ============================================================
   Les fichiers des fournisseurs n'ont jamais les mêmes en-têtes.
   On reconnaît les plus courants tout seul, et la correspondance
   reste modifiable à l'écran avant de lancer l'import.
   ============================================================ */

import { normalize } from '../text';

export type FieldKey =
  | 'sku' | 'name' | 'description' | 'category' | 'division'
  | 'price' | 'comparePrice' | 'cost' | 'unit' | 'minQuantity'
  | 'stock' | 'lowStockThreshold' | 'trackStock'
  | 'status' | 'featured'
  | 'brand' | 'origin' | 'barcode' | 'weightGrams' | 'tags';

export type FieldDef = {
  key: FieldKey;
  label: string;
  hint: string;
  type: 'text' | 'amount' | 'number' | 'boolean' | 'status' | 'list';
  /** Seul « name » est indispensable pour créer une fiche. */
  required?: boolean;
  aliases: string[];
  example: string;
};

/**
 * Ordre d'affichage dans l'écran de correspondance : les champs
 * dont elle a besoin d'abord, les détails ensuite.
 */
export const FIELDS: FieldDef[] = [
  {
    key: 'name',
    label: 'Nom de l’article',
    hint: 'Le nom lu par le client sur la boutique.',
    type: 'text',
    required: true,
    example: 'Riz parfumé 25 kg',
    aliases: [
      'nom', 'nom article', 'nom du produit', 'nom produit', 'designation',
      'désignation', 'libelle', 'libellé', 'article', 'produit', 'intitule',
      'intitulé', 'description courte', 'name', 'product', 'product name',
      'title', 'item', 'item name',
    ],
  },
  {
    key: 'sku',
    label: 'Référence',
    hint: 'Clé de rapprochement : un même code met la fiche à jour au lieu d’en créer une seconde. Déduite du nom si absente.',
    type: 'text',
    example: 'RIZ-25KG',
    aliases: [
      'reference', 'référence', 'ref', 'réf', 'code', 'code article',
      'code produit', 'sku', 'id', 'identifiant', 'article code',
      'product code', 'item code',
    ],
  },
  {
    key: 'price',
    label: 'Prix de vente',
    hint: 'En francs CFA. Les espaces et le mot FCFA sont ignorés.',
    type: 'amount',
    example: '18 500',
    aliases: [
      'prix', 'prix de vente', 'prix vente', 'prix unitaire', 'pu',
      'p.u', 'p.u.', 'pu de vente', 'pu vente', 'pv', 'prix public',
      'prix ttc', 'prix ht', 'prix detail', 'prix de detail', 'tarif',
      'montant', 'price', 'selling price', 'unit price', 'retail price',
    ],
  },
  {
    key: 'stock',
    label: 'Stock',
    hint: 'Quantité disponible aujourd’hui.',
    type: 'number',
    example: '40',
    aliases: [
      'stock', 'quantite', 'quantité', 'qte', 'qté', 'qty', 'disponible',
      'disponibilite', 'disponibilité', 'en stock', 'stock disponible',
      'quantity', 'inventory', 'on hand',
    ],
  },
  {
    key: 'category',
    label: 'Catégorie',
    hint: 'Le rayon. Créé automatiquement s’il n’existe pas encore.',
    type: 'text',
    example: 'Épicerie',
    aliases: [
      'categorie', 'catégorie', 'rayon', 'famille', 'sous famille',
      'sous-famille', 'groupe', 'type', 'classe', 'category', 'department',
      'group', 'family',
    ],
  },
  {
    key: 'unit',
    label: 'Unité',
    hint: 'Pièce, kg, sac, carton, litre, mètre…',
    type: 'text',
    example: 'sac',
    aliases: [
      'unite', 'unité', 'conditionnement', 'emballage', 'mesure',
      'unite de vente', 'unité de vente', 'uv', 'unit', 'uom', 'packaging',
    ],
  },
  {
    key: 'cost',
    label: 'Prix d’achat',
    hint: 'Sert au calcul de la marge. Jamais affiché au client.',
    type: 'amount',
    example: '15 000',
    aliases: [
      'cout', 'coût', 'prix achat', "prix d'achat", 'prix d’achat',
      "prix d'achat ht", 'pa', "p.a.", 'achat', 'prix de revient',
      'revient', 'cout unitaire', 'cout achat', 'prix fournisseur',
      'cost', 'purchase price', 'buy price', 'cost price',
    ],
  },
  {
    key: 'comparePrice',
    label: 'Ancien prix',
    hint: 'Affiché barré. À ne remplir que s’il a réellement été pratiqué.',
    type: 'amount',
    example: '20 000',
    aliases: [
      'ancien prix', 'prix barre', 'prix barré', 'prix avant',
      'prix initial', 'prix normal', 'prix catalogue',
      'compare price', 'old price', 'was price', 'list price', 'msrp',
    ],
  },
  {
    key: 'description',
    label: 'Description',
    hint: 'Quelques lignes sur l’article.',
    type: 'text',
    example: 'Riz long grain, sac de 25 kg, origine Thaïlande.',
    aliases: [
      'description', 'descriptif', 'detail', 'détail', 'details',
      'détails', 'commentaire', 'notes', 'texte', 'long description',
      'body', 'resume', 'résumé',
    ],
  },
  {
    key: 'brand',
    label: 'Marque',
    hint: '',
    type: 'text',
    example: 'Dangote',
    aliases: ['marque', 'fabricant', 'fournisseur', 'brand', 'manufacturer', 'vendor', 'supplier'],
  },
  {
    key: 'origin',
    label: 'Origine',
    hint: 'Pays ou provenance.',
    type: 'text',
    example: 'Cameroun',
    aliases: ['origine', 'provenance', 'pays', 'pays origine', "pays d'origine", 'origin', 'country', 'made in'],
  },
  {
    key: 'barcode',
    label: 'Code-barres',
    hint: '',
    type: 'text',
    example: '6181100030019',
    aliases: ['code barre', 'code barres', 'code-barres', 'codebarre', 'ean', 'ean13', 'gencod', 'upc', 'barcode', 'gtin'],
  },
  {
    key: 'minQuantity',
    label: 'Quantité minimum',
    hint: 'Pour la vente en gros : 1 par défaut.',
    type: 'number',
    example: '10',
    aliases: [
      'quantite minimum', 'quantité minimum', 'qte min', 'qté min',
      'minimum', 'min', 'commande minimum', 'lot minimum',
      'min quantity', 'moq', 'min order',
    ],
  },
  {
    key: 'lowStockThreshold',
    label: 'Seuil d’alerte',
    hint: 'En dessous, l’article remonte dans « stock bas ».',
    type: 'number',
    example: '5',
    aliases: [
      'seuil', 'seuil alerte', "seuil d'alerte", 'seuil de reapprovisionnement',
      'stock minimum', 'stock mini', 'alerte', 'low stock', 'reorder point', 'threshold',
    ],
  },
  {
    key: 'weightGrams',
    label: 'Poids (g)',
    hint: 'En grammes, pour le calcul du transport.',
    type: 'number',
    example: '25000',
    aliases: ['poids', 'poids net', 'poids brut', 'masse', 'weight', 'grams', 'kg'],
  },
  {
    key: 'status',
    label: 'Statut',
    hint: 'Publié ou brouillon. Le réglage d’import s’applique si la colonne est absente.',
    type: 'status',
    example: 'publié',
    aliases: ['statut', 'etat', 'état', 'publie', 'publié', 'publication', 'visible', 'actif', 'status', 'published', 'active', 'state'],
  },
  {
    key: 'featured',
    label: 'Mis en avant',
    hint: 'Apparaît en tête de la boutique.',
    type: 'boolean',
    example: 'oui',
    aliases: ['en avant', 'mis en avant', 'vedette', 'coup de coeur', 'coup de cœur', 'featured', 'highlight', 'promo'],
  },
  {
    key: 'trackStock',
    label: 'Suivre le stock',
    hint: 'Non pour un service ou un article toujours disponible.',
    type: 'boolean',
    example: 'oui',
    aliases: ['suivre le stock', 'gestion stock', 'gestion de stock', 'suivi stock', 'track stock', 'manage stock', 'track inventory'],
  },
  {
    key: 'tags',
    label: 'Mots-clés',
    hint: 'Séparés par des virgules. Aident la recherche.',
    type: 'list',
    example: 'riz, gros, sac',
    aliases: ['mots cles', 'mots-clés', 'mots clés', 'etiquettes', 'étiquettes', 'tags', 'keywords', 'labels'],
  },
  {
    key: 'division',
    label: 'Activité',
    hint: 'Commerce, import-export, agriculture, transport, BTP, services.',
    type: 'text',
    example: 'commerce',
    aliases: ['activite', 'activité', 'division', 'metier', 'métier', 'pole', 'pôle', 'secteur', 'business unit'],
  },
];

export const FIELD_BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));

/** Colonne ignorée : valeur sentinelle de l'écran de correspondance. */
export const IGNORE = '';

/**
 * Nettoie un en-tête pour la comparaison : sans accent, sans
 * ponctuation de séparation, espaces normalisés.
 * « P.U. de vente » → « p u de vente ».
 */
function clean(value: string): string {
  return normalize(value)
    .replace(/[._/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Note la ressemblance entre un en-tête et un alias.
 * Plus l'alias reconnu est long, plus la note est haute : « prix
 * d'achat » l'emporte ainsi sur le simple « prix », et une colonne
 * de prix d'achat ne part pas dans le prix de vente.
 */
function score(header: string, alias: string): number {
  if (!alias) return 0;
  if (header === alias) return 1000 + alias.length;
  if (alias.length >= 3 && header.startsWith(alias)) return 500 + alias.length;
  if (alias.length >= 3 && header.endsWith(alias)) return 300 + alias.length;
  if (alias.length >= 4 && header.includes(alias)) return 100 + alias.length;
  return 0;
}

/**
 * Devine la correspondance colonne → champ.
 *
 * Toutes les paires (colonne, champ) sont notées, puis attribuées
 * de la meilleure à la moins bonne. Un champ n'est pris qu'une fois,
 * et une colonne ne reçoit qu'un champ : on évite ainsi qu'une
 * colonne très évidente se fasse souffler sa place par une colonne
 * rencontrée plus tôt dans le fichier.
 */
export function guessMapping(headers: string[]): Record<string, FieldKey | ''> {
  const mapping: Record<string, FieldKey | ''> = {};
  for (const header of headers) mapping[header] = IGNORE;

  const cleaned = new Map(headers.map((h) => [h, clean(h)]));

  type Pair = { header: string; field: FieldKey; score: number };
  const pairs: Pair[] = [];

  for (const header of headers) {
    const text = cleaned.get(header)!;
    if (!text) continue;

    for (const field of FIELDS) {
      let best = 0;
      for (const alias of field.aliases) {
        const value = score(text, clean(alias));
        if (value > best) best = value;
      }
      if (best > 0) pairs.push({ header, field: field.key, score: best });
    }
  }

  // De la meilleure note à la moins bonne ; à note égale, l'ordre
  // des colonnes du fichier départage, ce qui rend le résultat stable.
  pairs.sort((a, b) => b.score - a.score || headers.indexOf(a.header) - headers.indexOf(b.header));

  const takenFields = new Set<FieldKey>();
  const takenHeaders = new Set<string>();

  for (const pair of pairs) {
    if (takenFields.has(pair.field) || takenHeaders.has(pair.header)) continue;
    mapping[pair.header] = pair.field;
    takenFields.add(pair.field);
    takenHeaders.add(pair.header);
  }

  return mapping;
}

/** En-têtes du modèle téléchargeable, dans l'ordre utile. */
export const TEMPLATE_HEADERS = [
  'Référence', 'Nom de l’article', 'Catégorie', 'Prix de vente',
  'Stock', 'Unité', 'Prix d’achat', 'Description', 'Marque',
  'Origine', 'Quantité minimum', 'Seuil d’alerte', 'Statut', 'Mots-clés',
] as const;

export const TEMPLATE_MAPPING: Record<string, FieldKey> = {
  'Référence': 'sku',
  'Nom de l’article': 'name',
  'Catégorie': 'category',
  'Prix de vente': 'price',
  'Stock': 'stock',
  'Unité': 'unit',
  'Prix d’achat': 'cost',
  'Description': 'description',
  'Marque': 'brand',
  'Origine': 'origin',
  'Quantité minimum': 'minQuantity',
  'Seuil d’alerte': 'lowStockThreshold',
  'Statut': 'status',
  'Mots-clés': 'tags',
};
