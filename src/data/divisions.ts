export type Division = {
  slug: string;
  number: string;
  name: string;
  shortName: string;
  kicker: string;
  summary: string;
  image: string;
  imageAlt: string;
  heroImage: string;
  heroAlt: string;
  offers: string[];
  accent: 'gold' | 'sky' | 'dawn';
};

export const divisions: Division[] = [
  {
    slug: 'commerce',
    number: '01',
    name: 'Commerce général',
    shortName: 'Commerce',
    kicker: 'Le comptoir',
    summary:
      "Épicerie, quincaillerie, textiles et produits frais. Au détail, en gros, sur commande. Ce qui est annoncé est disponible, ou nous vous disons quand il le sera.",
    image: 'grocery-cans',
    imageAlt: "Rayons d'un commerce général remplis de produits du quotidien",
    heroImage: 'grocery-aisle',
    heroAlt: "Allée d'un commerce général avec des étagères bien garnies",
    offers: [
      'Épicerie et produits du quotidien',
      'Quincaillerie et matériaux',
      'Textiles et articles de maison',
      'Produits frais et céréales',
    ],
    accent: 'gold',
  },
  {
    slug: 'import-export',
    number: '02',
    name: 'Import-export',
    shortName: 'Import-export',
    kicker: 'La route',
    summary:
      "Sourcing, achat, fret, dédouanement et réception. Nous allons chercher loin ce qui manque ici, et nous suivons la marchandise jusqu'à vous.",
    image: 'port-containers',
    imageAlt: "Port de conteneurs vu du ciel, grues et piles de conteneurs colorés",
    heroImage: 'port-cranes',
    heroAlt: "Grues portuaires au crépuscule devant des navires de fret",
    offers: [
      'Sourcing et achat',
      'Fret et dédouanement',
      'Réception et contrôle',
      'Livraison au lieu convenu',
    ],
    accent: 'sky',
  },
  {
    slug: 'agriculture-elevage',
    number: '03',
    name: 'Agriculture & élevage',
    shortName: 'Agriculture',
    kicker: 'Le champ',
    summary:
      "Cultures, intrants, élevage, collecte et mise en marché. Le travail de la terre, accompagné du premier sac de semence jusqu'au dernier chargement.",
    image: 'maize-farmer',
    imageAlt: "Agriculteur debout dans un champ de maïs, une houe sur l'épaule",
    heroImage: 'bafoussam-field',
    heroAlt: "Champ en terrasses sur les collines verdoyantes de l'Ouest camerounais",
    offers: [
      'Cultures et intrants',
      'Volaille, porc et bétail',
      'Collecte et transport',
      'Achat de production locale',
    ],
    accent: 'gold',
  },
  {
    slug: 'transport',
    number: '04',
    name: 'Transport',
    shortName: 'Transport',
    kicker: 'Le convoi',
    summary:
      "Marchandises, matériaux et véhicules. Nous organisons le chargement, la route et la remise, avec un interlocuteur qui suit le dossier.",
    image: 'truck-loaded',
    imageAlt: "Camion chargé de sacs de marchandises sur une route camerounaise",
    heroImage: 'truck-road',
    heroAlt: "Camions sur une piste de terre dans une région rurale",
    offers: [
      'Transport de marchandises',
      'Livraison de commandes',
      'Transport de matériaux',
      'Coordination de chargement',
    ],
    accent: 'dawn',
  },
  {
    slug: 'btp',
    number: '05',
    name: 'BTP',
    shortName: 'BTP',
    kicker: 'Le chantier',
    summary:
      "Matériaux, construction et rénovation. Des quantités justes, un approvisionnement suivi et un devis construit sur le réel.",
    image: 'construction-bricks',
    imageAlt: "Ouvriers sur un chantier manipulant des briques de terre",
    heroImage: 'construction-rebar',
    heroAlt: "Chantier de construction avec colonnes en béton et armatures métalliques",
    offers: [
      'Fourniture de matériaux',
      'Construction',
      'Rénovation',
      'Travaux et finitions',
    ],
    accent: 'sky',
  },
  {
    slug: 'services',
    number: '06',
    name: 'Services',
    shortName: 'Services',
    kicker: 'Le service',
    summary:
      "Achat sur commande, approvisionnement régulier, regroupement et livraison. Nous prenons en charge ce qui vous prend du temps.",
    image: 'fabric-seller',
    imageAlt: "Vendeuse de tissus africains arrangeant des pièces colorées sur son étal",
    heroImage: 'shopkeeper-portrait',
    heroAlt: "Commerçant souriant derrière son comptoir bien garni",
    offers: [
      'Achat sur commande',
      'Approvisionnement régulier',
      'Regroupement et livraison',
      'Conseil et accompagnement',
    ],
    accent: 'gold',
  },
];

export const divisionBySlug = Object.fromEntries(
  divisions.map((division) => [division.slug, division]),
);
