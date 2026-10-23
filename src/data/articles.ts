export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  dateISO: string;
  readTime: string;
  image: string;
  imageAlt: string;
};

export const articles: Article[] = [
  {
    slug: 'le-prix-affiche-est-le-prix-paye',
    title: 'Le prix affiché est le prix payé',
    excerpt:
      "Pourquoi nous refusons les frais ajoutés à la caisse, et ce que cette règle change dans la manière de tenir un commerce.",
    category: 'La promesse',
    date: '12 octobre 2026',
    dateISO: '2026-10-12',
    readTime: '5 min',
    image: 'shopkeeper-grains',
    imageAlt: 'Commerçant comptant des billets dans sa boutique',
  },
  {
    slug: 'acheter-en-gros-a-bafoussam',
    title: 'Acheter en gros sans mauvaise surprise',
    excerpt:
      "Une checklist simple pour vérifier le prix, la quantité, la qualité et le délai avant de confirmer une commande.",
    category: 'Guide',
    date: '28 septembre 2026',
    dateISO: '2026-09-28',
    readTime: '6 min',
    image: 'warehouse-aisle',
    imageAlt: 'Vue en hauteur d’un entrepôt avec des rayonnages et des cartons',
  },
  {
    slug: 'maranatha-ce-que-le-mot-veut-dire',
    title: 'Maranatha : ce que le mot veut dire',
    excerpt:
      "Un mot araméen, une prière ancienne, et une manière très concrète de travailler au quotidien.",
    category: 'La maison',
    date: '10 septembre 2026',
    dateISO: '2026-09-10',
    readTime: '4 min',
    image: 'bafoussam-city',
    imageAlt: 'Vue sur les toits et les collines de Bafoussam',
  },
  {
    slug: 'importer-sans-mauvaise-surprise',
    title: 'Importer sans mauvaise surprise',
    excerpt:
      "Cinq questions à poser avant de confier une marchandise à la route : le prix, le fret, la douane, le contrôle et le recours.",
    category: 'Import-export',
    date: '24 août 2026',
    dateISO: '2026-08-24',
    readTime: '7 min',
    image: 'port-cargo',
    imageAlt: 'Navire de fret chargé de conteneurs au port',
  },
];

export const articleBySlug = Object.fromEntries(articles.map((article) => [article.slug, article]));
