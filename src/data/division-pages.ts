export type DivisionOffer = {
  title: string;
  text: string;
  tags: string[];
};

export type DivisionPage = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  hero: {
    title: string;
    lede: string;
    caption: string;
    image: string;
    imageAlt: string;
    position?: string;
  };
  meta: { label: string; value: string }[];
  intro: {
    label: string;
    title: string;
    body: string[];
    points: { label: string; text: string }[];
    mainImage: string;
    mainAlt: string;
    insetImage: string;
    insetAlt: string;
    stampLabel: string;
    stampTitle: string;
    caption: string;
  };
  offers: {
    label: string;
    title: string;
    intro: string;
    items: DivisionOffer[];
  };
  field: {
    label: string;
    title: string;
    body: string[];
    points: string[];
    image: string;
    imageAlt: string;
    caption: string;
  };
  process: {
    title: string;
    intro: string;
    steps: { number: string; title: string; text: string }[];
  };
  quote: string;
  faqs: { question: string; answer: string }[];
  related: string[];
};

export const divisionPages: DivisionPage[] = [
  {
    slug: 'commerce',
    seoTitle: 'Commerce général à Bafoussam',
    seoDescription:
      "Épicerie, quincaillerie, textiles et produits frais à Bafoussam. Au détail, en gros et sur commande, avec des prix affichés et une disponibilité dite vrai.",
    hero: {
      title: 'Le comptoir, <em>tenu juste.</em>',
      lede:
        "Épicerie, quincaillerie, textiles, produits frais. Au détail ou en gros, la même règle : ce qui est annoncé est disponible, et le prix affiché est le prix payé.",
      caption: 'Derrière le comptoir, Bafoussam.',
      image: 'shopkeeper-store',
      imageAlt: 'Commerçant en chemise bleue derrière le comptoir de sa boutique',
      position: '50% 35%',
    },
    meta: [
      { label: 'Format', value: 'Détail · Gros · Commande' },
      { label: 'Rayons', value: 'Épicerie · Quincaillerie · Textiles' },
      { label: 'Remise', value: 'Retrait à Bafoussam · Livraison sur devis' },
    ],
    intro: {
      label: 'Le comptoir',
      title: 'Un commerce de proximité, <em>sans petites lignes.</em>',
      body: [
        "Notre rayon part de ce dont on a besoin chaque semaine : de quoi cuisiner, réparer, s'habiller et équiper la maison. Le principe est simple. Nous vendons ce que nous pouvons nommer, compter et remplacer.",
        "Au détail, la même attention qu'en gros. Pour une commande plus large, nous préparons un devis avec les quantités, le conditionnement et le transport. Si un article manque, nous disons quand il revient — ou nous proposons une alternative équivalente.",
      ],
      points: [
        { label: 'Le prix', text: "Le montant annoncé en rayon est celui qui est encaissé, hors remise clairement indiquée." },
        { label: 'La disponibilité', text: "Un article annoncé disponible est vérifié avant la confirmation de votre commande." },
        { label: 'Le gros', text: "Quantités, conditionnement et livraison sont écrits sur le devis, pas ajoutés à la caisse." },
      ],
      mainImage: 'hardware-shopkeeper',
      mainAlt: 'Commerçant dans une quincaillerie, entouré d’outils et d’articles ménagers',
      insetImage: 'grocery-dairy',
      insetAlt: 'Rayon de boissons et de produits laitiers dans une épicerie',
      stampLabel: '01 · Commerce général',
      stampTitle: 'Détail & gros',
      caption: 'Étagères de notre rayon épicerie, Bafoussam.',
    },
    offers: {
      label: 'Les rayons',
      title: 'Ce que vous trouvez <em>au comptoir.</em>',
      intro:
        "Quatre familles de produits, un même niveau d'exigence : un prix lisible, une quantité vérifiable et un conseil qui ne force pas la vente.",
      items: [
        {
          title: 'Épicerie du quotidien',
          text: "Riz, huile, sucre, conserves, pâtes, boissons et produits de base. Des marques connues et des formats adaptés aux familles comme aux revendeurs.",
          tags: ['Riz', 'Huiles', 'Conserves', 'Boissons'],
        },
        {
          title: 'Quincaillerie & matériaux',
          text: "Visserie, outils, peinture, articles de fixation et petit matériel. Pour le particulier qui répare comme pour le chantier qui prépare.",
          tags: ['Outils', 'Visserie', 'Peinture', 'Fixation'],
        },
        {
          title: 'Textiles & maison',
          text: "Pagnes, tissus, linge de maison et ustensiles. Une sélection lisible, avec des prix au mètre ou à la pièce clairement annoncés.",
          tags: ['Pagnes', 'Tissus', 'Ustensiles'],
        },
        {
          title: 'Frais & céréales',
          text: "Produits frais et céréales selon la saison et les arrivages. Nous indiquons l'origine lorsque nous la connaissons et le calibre lorsque cela compte.",
          tags: ['Céréales', 'Produits frais', 'Saison'],
        },
      ],
    },
    field: {
      label: 'Sur le terrain',
      title: 'Acheter en gros, <em>sans perdre le fil.</em>',
      body: [
        "Une commande en gros n'est pas seulement une grande quantité. C'est une unité, un conditionnement, un délai et un lieu de remise. Nous préférons poser ces questions avant plutôt que de corriger après.",
        "Vous pouvez préparer votre liste par rayon, avec les quantités souhaitées. Nous revenons avec ce qui est disponible, ce qui doit être commandé et le prix rendu. Vous décidez ensuite, sans engagement.",
      ],
      points: [
        "Donnez la quantité dans l'unité qui compte : sac, carton, mètre ou pièce.",
        "Demandez le prix rendu, transport compris, si la livraison fait partie de la commande.",
        "Fixez un délai et un lieu de retrait avant de confirmer.",
      ],
      image: 'grocery-drinks',
      imageAlt: 'Bouteilles et conserves alignées sur les étagères d’une épicerie',
      caption: 'Un rayon préparé pour la vente au détail et la commande en gros.',
    },
    process: {
      title: 'De la liste <em>à la remise.</em>',
      intro: "Quatre étapes simples, que nous suivons pour chaque commande, petite ou grande.",
      steps: [
        { number: '01', title: 'Votre liste', text: "Produits, quantités et date souhaitée. Une photo de votre liste suffit pour commencer." },
        { number: '02', title: 'La vérification', text: "Nous confirmons le stock, le conditionnement et ce qui doit être commandé." },
        { number: '03', title: 'Le prix confirmé', text: "Le devis distingue les produits, le transport et les éventuels frais de commande." },
        { number: '04', title: 'La remise', text: "Retrait au comptoir ou livraison au lieu convenu, avec un état de la commande." },
      ],
    },
    quote: "Un client qui revient vaut mieux qu'une vente forcée.",
    faqs: [
      {
        question: 'Vendez-vous uniquement en gros ?',
        answer:
          "Non. Nous servons les particuliers au détail et les revendeurs, chantiers ou institutions en gros. Les conditions changent avec le volume, pas la manière de traiter la commande.",
      },
      {
        question: 'Puis-je réserver un article ?',
        answer:
          "Oui, dans la limite du stock disponible. Nous confirmons la quantité, le prix et la durée de réservation par écrit. Sans confirmation, l'article reste proposé aux autres clients.",
      },
      {
        question: 'Les prix sont-ils négociables ?',
        answer:
          "Nos prix sont affichés. Une remise peut être étudiée sur un volume important, mais elle est annoncée avant la commande. Elle n'est jamais ajoutée — ni retirée — après coup.",
      },
      {
        question: 'Livrez-vous à Bafoussam ?',
        answer:
          "Nous livrons à Bafoussam et dans les environs selon la nature et le volume de la commande. Le transport est chiffré sur le devis avant validation.",
      },
      {
        question: 'Que se passe-t-il si un produit manque ?',
        answer:
          "Nous vous le disons avant la livraison, avec une date de retour prévue ou une alternative de qualité et de prix comparables. Vous restez libre de retirer la ligne de la commande.",
      },
    ],
    related: ['import-export', 'transport', 'services'],
  },
  {
    slug: 'import-export',
    seoTitle: 'Import-export et sourcing',
    seoDescription:
      "Sourcing, achat, fret, dédouanement et réception de marchandises pour le Cameroun. Un interlocuteur suit votre dossier de la commande à la remise.",
    hero: {
      title: 'Ce qui manque ici, <em>nous allons le chercher.</em>',
      lede:
        "Sourcing, achat, fret, dédouanement et réception. Nous allons chercher loin ce qui manque ici, et nous suivons la marchandise jusqu'à vous.",
      caption: 'Port de commerce, la nuit.',
      image: 'port-night',
      imageAlt: 'Port de commerce illuminé à la tombée de la nuit, grues et navires',
      position: '50% 55%',
    },
    meta: [
      { label: 'Périmètre', value: 'Sourcing · Fret · Douane' },
      { label: 'Suivi', value: 'Un interlocuteur par dossier' },
      { label: 'Remise', value: 'Bafoussam et Cameroun' },
    ],
    intro: {
      label: 'La route',
      title: "La route est longue. <em>Le suivi ne l'est pas.</em>",
      body: [
        "Importer, ce n'est pas seulement trouver un prix quelque part. C'est choisir un fournisseur, vérifier ce qu'on achète, comprendre ce que coûte le transport et savoir qui répond si la marchandise arrive abîmée.",
        "Nous prenons en charge ce fil. Un interlocuteur suit le dossier, du brief jusqu'à la remise. À chaque étape, vous savez ce qui est confirmé, ce qui reste à vérifier et ce que cela change pour le prix final.",
      ],
      points: [
        { label: 'Le périmètre écrit', text: "La marchandise, la quantité, le budget et le délai sont fixés avant le départ." },
        { label: 'Le coût complet', text: "Achat, fret, assurance éventuelle, douane et livraison sont distingués sur la proposition." },
        { label: 'Le contrôle', text: "Nous vérifions la marchandise à réception et documentons les écarts constatés." },
      ],
      mainImage: 'warehouse-pallets',
      mainAlt: 'Chariot élévateur manipulant des palettes dans un entrepôt',
      insetImage: 'warehouse-team',
      insetAlt: 'Équipe dans une allée d’entrepôt entre des rayonnages de marchandises',
      stampLabel: '02 · Import-export',
      stampTitle: 'Sourcing & fret',
      caption: 'Réception et contrôle avant remise au client.',
    },
    offers: {
      label: 'La chaîne',
      title: 'De la recherche <em>à la remise.</em>',
      intro:
        "Chaque maillon a son propre risque. Nous les traitons séparément, puis nous vous donnons une vue d'ensemble avant de vous engager.",
      items: [
        {
          title: 'Sourcing & achat',
          text: "Recherche de fournisseurs, comparaison des offres, échantillons et vérification des quantités minimales. Nous achetons ce qui correspond au brief, pas ce qui est le plus facile à vendre.",
          tags: ['Fournisseurs', 'Échantillons', 'Prix'],
        },
        {
          title: 'Fret & dédouanement',
          text: "Nous organisons le transport international et coordonnons les formalités douanières avec les partenaires compétents. Les documents et les coûts sont suivis jusqu'à la mainlevée.",
          tags: ['Fret', 'Douane', 'Documents'],
        },
        {
          title: 'Réception & contrôle',
          text: "À l'arrivée, nous vérifions les quantités, l'emballage et la conformité apparente. Les écarts sont signalés avant la livraison finale, avec photos lorsque c'est utile.",
          tags: ['Contrôle', 'Quantité', 'Qualité'],
        },
        {
          title: 'Livraison & remise',
          text: "Du port ou de l'entrepôt jusqu'à Bafoussam, nous organisons le dernier trajet et la remise. Vous savez quand la marchandise arrive et ce qu'il faut préparer pour la recevoir.",
          tags: ['Bafoussam', 'Remise', 'Suivi'],
        },
      ],
    },
    field: {
      label: 'Le prix',
      title: "Le prix complet, <em>pas le prix d'appel.</em>",
      body: [
        "Un prix rendu se construit avec plusieurs lignes : la marchandise, le fret, les formalités, la manutention et la livraison. Nous préférons les montrer toutes avant la commande plutôt que d'en découvrir une à l'arrivée.",
        "Si un coût ne peut pas être confirmé à l'avance — une variation de change, par exemple — nous l'indiquons comme une estimation et nous vous prévenons dès qu'il devient certain. Vous gardez la décision.",
      ],
      points: [
        "Demandez toujours le prix rendu à destination, pas seulement le prix départ fournisseur.",
        "Faites préciser ce qui est inclus : fret, assurance, douane, transport local, manutention.",
        "Gardez une trace écrite de la quantité commandée et de la quantité reçue.",
      ],
      image: 'delivery-city',
      imageAlt: 'Livreur à moto avec une caisse de livraison, en ville',
      caption: 'Le dernier kilomètre fait partie de la commande.',
    },
    process: {
      title: 'Un dossier, <em>quatre étapes.</em>',
      intro: "Nous avançons par étapes courtes, avec une validation à chaque fois qu'un coût ou un délai change.",
      steps: [
        { number: '01', title: 'Le brief', text: "Produit, usage, quantité, budget, délai et destination. Nous préférons une photo ou un modèle à une description vague." },
        { number: '02', title: 'La proposition', text: "Fournisseur, prix, échantillon si nécessaire et coût complet estimé. Vous validez avant tout engagement." },
        { number: '03', title: 'La route & la douane', text: "Nous organisons le fret, suivons les documents et vous informons des étapes réelles, sans promesse inventée." },
        { number: '04', title: 'Le contrôle & la remise', text: "Vérification à réception, signalement des écarts, puis livraison et remise au lieu convenu." },
      ],
    },
    quote: "Une marchandise sans suivi n'est pas une commande. C'est une espérance.",
    faqs: [
      {
        question: "Quels sont les délais d'importation ?",
        answer:
          "Ils dépendent du pays d'origine, du mode de transport, des formalités douanières et de la disponibilité réelle du fournisseur. Nous donnons une fourchette au moment de la proposition et la révisons si une étape change.",
      },
      {
        question: 'Pouvez-vous gérer les formalités douanières ?',
        answer:
          "Nous coordonnons le dossier avec les partenaires compétents et suivons les documents. La responsabilité réglementaire reste celle des acteurs habilités ; nous vous disons clairement qui fait quoi.",
      },
      {
        question: 'Y a-t-il une quantité minimale ?',
        answer:
          "Elle dépend du fournisseur et du produit. Nous pouvons regrouper plusieurs références ou plusieurs clients pour atteindre un volume cohérent lorsque cela est possible.",
      },
      {
        question: 'Comment se passe le paiement ?',
        answer:
          "Le calendrier de paiement est précisé sur la proposition : acompte, paiement à l'expédition ou à la réception. Aucun paiement n'est demandé avant que le périmètre et le coût complet soient écrits.",
      },
      {
        question: 'Que se passe-t-il en cas de retard ou d’avarie ?',
        answer:
          "Nous documentons l'état de la marchandise et vous informons dès que nous avons une information fiable. Selon le cas, nous traitons avec le transporteur, l'assureur ou le fournisseur, et vous recevez une solution écrite.",
      },
    ],
    related: ['commerce', 'transport', 'services'],
  },
  {
    slug: 'agriculture-elevage',
    seoTitle: 'Agriculture et élevage',
    seoDescription:
      "Intrants, cultures, élevage, collecte et mise en marché dans l'Ouest camerounais. Un accompagnement concret du premier sac de semence au dernier chargement.",
    hero: {
      title: 'La terre travaille. <em>Nous accompagnons.</em>',
      lede:
        "Cultures, intrants, élevage, collecte et mise en marché. Le travail de la terre, accompagné du premier sac de semence jusqu'au dernier chargement.",
      caption: 'Le marché du maïs, Bafoussam.',
      image: 'maize-market',
      imageAlt: 'Tas d’épis de maïs fraîchement récoltés sur un étal',
      position: '50% 45%',
    },
    meta: [
      { label: 'Production', value: 'Cultures · Élevage' },
      { label: 'Appui', value: 'Intrants · Collecte' },
      { label: 'Débouché', value: 'Achat · Mise en marché' },
    ],
    intro: {
      label: 'Le champ',
      title: 'Du champ au chargement, <em>la même attention.</em>',
      body: [
        "Le travail agricole se joue sur un cycle : préparer, semer, entretenir, récolter, vendre. Chaque étape a son calendrier et ses imprévus. Notre rôle est de réduire les ruptures entre elles.",
        "Nous fournissons des intrants et du petit matériel, accompagnons l'élevage, organisons la collecte et achetons une partie de la production locale. L'objectif n'est pas de décider à la place de l'agriculteur, mais de rendre le marché plus lisible.",
      ],
      points: [
        { label: 'Le cycle', text: "Nous tenons compte du calendrier réel de la culture ou de l'élevage avant de proposer une livraison." },
        { label: 'Les intrants', text: "Semences, engrais et petit matériel sont fournis avec leur conditionnement et leur prix." },
        { label: 'La collecte', text: "Quantité, qualité et lieu d'enlèvement sont convenus avant le chargement." },
      ],
      mainImage: 'cattle-herd',
      mainAlt: 'Troupeau de bovins dans un pâturage arboré',
      insetImage: 'poultry-farm',
      insetAlt: 'Éleveuse nourrissant ses volailles dans une ferme',
      stampLabel: '03 · Agriculture & élevage',
      stampTitle: 'Du champ au marché',
      caption: 'Élevage et cultures, deux rythmes complémentaires.',
    },
    offers: {
      label: 'Les travaux',
      title: 'Ce que nous accompagnons <em>sur le terrain.</em>',
      intro:
        "Des fournitures concrètes et des débouchés clairs, avec des conditions écrites avant l'enlèvement ou la livraison.",
      items: [
        {
          title: 'Cultures & intrants',
          text: "Semences, engrais, produits de traitement et petit matériel agricole. Nous fournissons ce qui est disponible et indiquons les alternatives lorsque la référence habituelle manque.",
          tags: ['Semences', 'Engrais', 'Matériel'],
        },
        {
          title: 'Élevage',
          text: "Volaille, porc et bovins : approvisionnement en aliments, matériel d'élevage et organisation de la vente. Nous travaillons avec l'éleveur, sans promettre de résultats sanitaires que nous ne pouvons pas garantir.",
          tags: ['Volaille', 'Porc', 'Bovins'],
        },
        {
          title: 'Collecte & transport',
          text: "Nous organisons l'enlèvement de la production, le conditionnement et le transport vers le point de vente ou de transformation convenu.",
          tags: ['Collecte', 'Conditionnement', 'Transport'],
        },
        {
          title: 'Achat de production',
          text: "Nous achetons récoltes et productions locales à un prix convenu avant l'enlèvement. La quantité, la qualité et le délai de paiement sont fixés par écrit.",
          tags: ['Récoltes', 'Prix convenu', 'Paiement'],
        },
      ],
    },
    field: {
      label: 'La récolte',
      title: 'Acheter la récolte <em>au bon moment.</em>',
      body: [
        "Le prix d'une récolte dépend de la quantité, de la qualité et du moment. Nous préférons regarder ensemble ce qui est réellement disponible avant de fixer un montant.",
        "Pour l'agriculteur, cela signifie savoir à l'avance ce qui sera enlevé et quand il sera payé. Pour l'acheteur, cela signifie recevoir une marchandise triée, pesée et transportée dans de bonnes conditions.",
      ],
      points: [
        "Faites constater la quantité et la qualité avant l'enlèvement.",
        "Convenez du prix, du délai de paiement et du lieu de chargement par écrit.",
        "Prévoyez le conditionnement et le transport : ils changent le prix rendu.",
      ],
      image: 'cattle-market',
      imageAlt: 'Bovins présentés au marché à bétail',
      caption: 'Marché à bétail : le poids et l’état des animaux se vérifient sur place.',
    },
    process: {
      title: 'Suivre le rythme <em>de la production.</em>',
      intro: "Nous nous adaptons au calendrier agricole, pas l'inverse.",
      steps: [
        { number: '01', title: 'Le cycle', text: "Culture ou élevage, superficie, effectif et étape en cours. Nous partons du réel." },
        { number: '02', title: 'Les intrants', text: "Quantités, références et date de disponibilité, avec le prix et le conditionnement." },
        { number: '03', title: 'La collecte', text: "Lieu, date, quantité et qualité convenus avant l'enlèvement." },
        { number: '04', title: 'La mise en marché', text: "Achat ferme ou recherche d'un débouché, avec un prix et un paiement écrits." },
      ],
    },
    quote: "La terre ne triche pas. Nous non plus.",
    faqs: [
      {
        question: 'Dans quelles zones intervenez-vous ?',
        answer:
          "Nous travaillons principalement dans la Région de l'Ouest autour de Bafoussam. Pour une collecte ou une livraison plus éloignée, nous étudions la faisabilité et le coût du transport avant de confirmer.",
      },
      {
        question: 'Fournissez-vous des conseils agronomiques ?',
        answer:
          "Nous partageons ce que nous savons du marché, des intrants et de la logistique. Pour les décisions techniques — traitements, santé animale, itinéraires culturaux — nous vous orientons vers les professionnels compétents.",
      },
      {
        question: 'Achetez-vous toute la production ?',
        answer:
          "Non. Nous achetons selon la demande, la qualité et la saison. Nous vous disons clairement ce que nous pouvons prendre, à quel prix et à quelle date, avant l'enlèvement.",
      },
      {
        question: 'Travaillez-vous avec les petits éleveurs ?',
        answer:
          "Oui, dès lors que le volume et le calendrier peuvent être organisés. Nous pouvons regrouper des commandes d'aliments ou des lots de volaille pour rendre le transport viable.",
      },
      {
        question: 'Comment le prix est-il fixé ?',
        answer:
          "Il tient compte de la quantité, de la qualité, du marché local, du conditionnement et du transport. Le montant et le calendrier de paiement sont écrits avant la collecte.",
      },
    ],
    related: ['commerce', 'transport', 'import-export'],
  },
  {
    slug: 'transport',
    seoTitle: 'Transport de marchandises',
    seoDescription:
      "Transport de marchandises, livraison de commandes, matériaux et coordination de chargement à Bafoussam et au Cameroun. Un interlocuteur suit la route jusqu'à la remise.",
    hero: {
      title: 'La marchandise arrive. <em>Et vous le savez.</em>',
      lede:
        "Marchandises, matériaux et véhicules. Nous organisons le chargement, la route et la remise, avec un interlocuteur qui suit le dossier.",
      caption: 'Sur la route, Région de l’Ouest.',
      image: 'truck-highway',
      imageAlt: 'Camion de marchandises sur une route de montagne',
      position: '50% 55%',
    },
    meta: [
      { label: 'Charge', value: 'Marchandises · Matériaux' },
      { label: 'Zone', value: 'Bafoussam · Cameroun' },
      { label: 'Suivi', value: 'Chargement · Remise' },
    ],
    intro: {
      label: 'Le convoi',
      title: 'Un convoi, un interlocuteur, <em>une remise.</em>',
      body: [
        "Le transport commence avant le départ. Il faut savoir ce qui est chargé, comment c'est protégé, par où le véhicule passe et qui reçoit à l'arrivée. Un détail oublié au chargement devient souvent un problème sur la route.",
        "Nous organisons le transport de vos marchandises, de vos commandes et de vos matériaux. Nous adaptons le véhicule au volume et à la nature de la charge, puis nous suivons le trajet jusqu'à la remise.",
      ],
      points: [
        { label: 'Le chargement', text: "Nature, volume et poids sont vérifiés avant de choisir le véhicule et d'arrêter le prix." },
        { label: 'La route', text: "Le trajet et le délai sont annoncés. En cas d'imprévu, vous êtes prévenu avec une nouvelle estimation." },
        { label: 'La remise', text: "Le destinataire, le lieu et l'heure sont confirmés avant le départ ; un état de remise peut être établi." },
      ],
      mainImage: 'delivery-moto',
      mainAlt: 'Convoyeur à moto chargé de colis sur une route',
      insetImage: 'truck-loaded',
      insetAlt: 'Camion chargé de sacs de marchandises sur une route camerounaise',
      stampLabel: '04 · Transport',
      stampTitle: 'Chargement & remise',
      caption: 'Du petit colis au chargement complet, le même suivi.',
    },
    offers: {
      label: 'Les trajets',
      title: 'Ce que nous <em>déplaçons.</em>',
      intro:
        "Un transport réussi se mesure à une marchandise arrivée au bon endroit, dans le bon état, avec une personne pour la recevoir.",
      items: [
        {
          title: 'Transport de marchandises',
          text: "Palettes, cartons, sacs et charges volumineuses. Nous choisissons le véhicule selon le poids, le volume et la fragilité de la marchandise.",
          tags: ['Palettes', 'Cartons', 'Sacs'],
        },
        {
          title: 'Livraison de commandes',
          text: "Livraison de vos commandes à Bafoussam et dans les environs, avec confirmation du destinataire et du créneau de remise.",
          tags: ['Bafoussam', 'Créneau', 'Remise'],
        },
        {
          title: 'Transport de matériaux',
          text: "Sable, gravier, ciment, fer et matériaux de chantier. Nous coordonnons le chargement et la livraison pour suivre le rythme du chantier.",
          tags: ['Ciment', 'Sable', 'Gravier', 'Fer'],
        },
        {
          title: 'Coordination de chargement',
          text: "Quand vous avez déjà un véhicule, nous pouvons organiser le chargement, la liste de colisage et la remise avec le destinataire.",
          tags: ['Colisage', 'Manutention', 'Remise'],
        },
      ],
    },
    field: {
      label: 'Avant le départ',
      title: 'Ce qui part, <em>ce qui arrive.</em>',
      body: [
        "La plupart des litiges de transport se règlent avec une information simple : une liste de chargement, une photo de l'état de départ et une personne nommée à l'arrivée.",
        "Nous prenons le temps de vérifier ces trois points pour les commandes que nous organisons. Ce n'est pas de la paperasse : c'est ce qui permet de savoir où se situe un problème et qui doit le traiter.",
      ],
      points: [
        "Établissez une liste de colisage : nombre, nature et poids approximatif.",
        "Confirmez le nom et le numéro du destinataire avant le chargement.",
        "Signalez tout emballage abîmé au départ et à l'arrivée.",
      ],
      image: 'bafoussam-transport',
      imageAlt: 'Gare routière de Bafoussam avec cars et véhicules stationnés',
      caption: 'Départ de la gare routière, Bafoussam.',
    },
    process: {
      title: 'La route, <em>préparée.</em>',
      intro: "Quatre points de contrôle avant de prendre la route.",
      steps: [
        { number: '01', title: 'Le besoin', text: "Nature de la marchandise, volume, départ, destination et délai souhaité." },
        { number: '02', title: 'Le chargement', text: "Véhicule adapté, protection de la charge et liste de colisage vérifiée." },
        { number: '03', title: 'La route', text: "Trajet et délai convenus, avec information en cas de retard ou d'imprévu." },
        { number: '04', title: 'La remise', text: "Destinataire confirmé, état de la marchandise vérifié et preuve de livraison." },
      ],
    },
    quote: "La route se prépare avant le départ.",
    faqs: [
      {
        question: 'Livrez-vous en dehors de Bafoussam ?',
        answer:
          "Oui, nous étudions les trajets vers les autres villes du Cameroun. Le prix dépend de la distance, du volume, du type de véhicule et des conditions de remise.",
      },
      {
        question: 'Quels types de véhicules utilisez-vous ?',
        answer:
          "Le véhicule est choisi selon la charge : moto pour les petits colis urbains, camionnette ou camion pour les volumes plus importants. Nous vous indiquons le type retenu avant le départ.",
      },
      {
        question: 'Peut-on suivre la marchandise ?',
        answer:
          "Nous donnons des nouvelles aux étapes importantes : départ, passage éventuel, arrivée. Le suivi n'est pas un écran temps réel ; c'est un interlocuteur qui sait où en est le dossier.",
      },
      {
        question: 'La marchandise est-elle assurée ?',
        answer:
          "L'assurance n'est pas automatique. Si la valeur de la marchandise le justifie, nous étudions une couverture avant le départ et vous indiquons ce qui est garanti et ce qui ne l'est pas.",
      },
      {
        question: 'Aidez-vous au chargement ?',
        answer:
          "Selon le volume et le lieu, nous pouvons organiser la manutention. Ce service est chiffré à part et confirmé avant le chargement.",
      },
    ],
    related: ['import-export', 'btp', 'commerce'],
  },
  {
    slug: 'btp',
    seoTitle: 'BTP, matériaux et construction',
    seoDescription:
      "Fourniture de matériaux, construction, rénovation et finitions à Bafoussam. Des quantités justes, un approvisionnement suivi et un devis construit sur le réel.",
    hero: {
      title: 'Des quantités justes. <em>Un chantier qui avance.</em>',
      lede:
        "Matériaux, construction et rénovation. Des quantités justes, un approvisionnement suivi et un devis construit sur le réel.",
      caption: 'Chantier en cours, Bafoussam.',
      image: 'construction-scaffold',
      imageAlt: 'Ouvriers sur un échafaudage en hauteur',
      position: '50% 40%',
    },
    meta: [
      { label: 'Fourniture', value: 'Matériaux · Quantitatif' },
      { label: 'Travaux', value: 'Construction · Rénovation' },
      { label: 'Suivi', value: 'Devis · Approvisionnement' },
    ],
    intro: {
      label: 'Le chantier',
      title: 'Le devis se construit sur le réel, <em>pas sur l’à-peu-près.</em>',
      body: [
        "Un chantier coûte cher quand il s'arrête. Le ciment qui manque, le fer livré en mauvaise section, la quantité annoncée sans vérification : ce sont rarement des drames, souvent des retards.",
        "Nous partons du plan, des mesures et du phasage réel. Nous proposons les matériaux, les quantités et le calendrier d'approvisionnement. Quand nous réalisons les travaux, le devis distingue clairement la fourniture, la main-d'œuvre et ce qui reste à la charge du client.",
      ],
      points: [
        { label: 'Le quantitatif', text: "Les quantités sont calculées à partir des plans et des mesures, pas d'une estimation au téléphone." },
        { label: 'Les matériaux', text: "Marque, section, qualité et prix sont nommés. Une substitution ne se fait pas sans accord écrit." },
        { label: 'Le phasage', text: "Les livraisons suivent l'avancement du chantier pour éviter les ruptures et les stocks inutiles." },
      ],
      mainImage: 'construction-foundation',
      mainAlt: 'Ouvriers et engins sur un chantier de fondation en terre rouge',
      insetImage: 'construction-plaster',
      insetAlt: 'Ouvrier travaillant sur un échafaudage devant une façade',
      stampLabel: '05 · BTP',
      stampTitle: 'Matériaux & travaux',
      caption: 'Fondations, gros œuvre et finitions suivis sur place.',
    },
    offers: {
      label: 'Les ouvrages',
      title: 'Du matériau <em>à la finition.</em>',
      intro:
        "Nous intervenons sur la fourniture, les travaux neufs et la rénovation. Chaque prestation a son devis et son calendrier.",
      items: [
        {
          title: 'Fourniture de matériaux',
          text: "Ciment, fer à béton, sable, gravier, tôles, bois et petit matériel. Livraison sur le chantier selon le planning convenu.",
          tags: ['Ciment', 'Fer', 'Sable', 'Tôles'],
        },
        {
          title: 'Construction',
          text: "Travaux de gros œuvre et construction neuve, réalisés à partir d'un plan et d'un devis détaillé. Nous travaillons avec des équipes identifiées et un suivi de chantier.",
          tags: ['Gros œuvre', 'Maçonnerie', 'Suivi'],
        },
        {
          title: 'Rénovation',
          text: "Reprise de murs, toitures, sols et aménagements. Nous évaluons l'état existant avant de proposer les travaux et leur ordre de priorité.",
          tags: ['Murs', 'Toiture', 'Sols'],
        },
        {
          title: 'Travaux & finitions',
          text: "Enduits, peinture, carrelage, plomberie et électricité de base, coordonnés avec les autres corps d'état lorsque le chantier le demande.",
          tags: ['Enduits', 'Peinture', 'Carrelage'],
        },
      ],
    },
    field: {
      label: 'Approvisionnement',
      title: 'Approvisionner <em>sans arrêter le chantier.</em>',
      body: [
        "Une livraison de matériaux doit arriver au bon moment, en bonne quantité et au bon endroit. Trop tôt, elle encombre le chantier. Trop tard, elle immobilise les équipes.",
        "Nous établissons un calendrier de livraison avec vous, puis nous ajustons en fonction de l'avancement réel. Chaque livraison est vérifiée : quantité, qualité apparente et conformité à la commande.",
      ],
      points: [
        "Fournissez le plan ou les mesures réelles avant l'établissement du quantitatif.",
        "Validez les références et les sections, pas seulement les prix.",
        "Prévoyez un espace de stockage accessible pour les livraisons.",
      ],
      image: 'construction-rebar',
      imageAlt: 'Armatures métalliques et engins sur un chantier',
      caption: 'Armatures et matériaux vérifiés à la livraison.',
    },
    process: {
      title: 'Un chantier <em>tenu.</em>',
      intro: "Nous avançons sur quatre étapes, avec un devis validé avant chaque engagement.",
      steps: [
        { number: '01', title: 'Le brief', text: "Plans, mesures, usage, budget et délai. Une visite sur site est préférable pour les travaux existants." },
        { number: '02', title: 'Le quantitatif', text: "Calcul des matériaux et des postes de travail, avec les références et les options." },
        { number: '03', title: 'Le devis', text: "Prix détaillés, calendrier, conditions de paiement et ce qui n'est pas inclus." },
        { number: '04', title: 'Le suivi', text: "Livraisons, exécution et contrôle à chaque étape, avec un interlocuteur identifié." },
      ],
    },
    quote: "Un chantier ne se rattrape pas avec des promesses.",
    faqs: [
      {
        question: 'Le devis est-il gratuit ?',
        answer:
          "Un devis simple est établi sans frais. Pour une étude plus poussée, une visite ou un métré complet, nous vous indiquons à l'avance si un frais d'étude s'applique et s'il est déductible des travaux.",
      },
      {
        question: 'Fournissez-vous les matériaux sans réaliser les travaux ?',
        answer:
          "Oui. Vous pouvez commander les matériaux et assurer vous-même la mise en œuvre. Nous restons responsables de la conformité et de la quantité livrée, pas de la pose que nous n'avons pas réalisée.",
      },
      {
        question: 'Quels matériaux proposez-vous ?',
        answer:
          "Ciment, fer à béton, sable, gravier, tôles, bois, peinture, carrelage et petit matériel. Les marques et références disponibles sont précisées sur le devis.",
      },
      {
        question: 'Comment gérez-vous les retards de chantier ?',
        answer:
          "Nous identifions la cause — approvisionnement, météo, main-d'œuvre ou décision client — et proposons un nouveau calendrier écrit. Les coûts éventuels sont discutés avant de poursuivre.",
      },
      {
        question: 'Intervenez-vous en dehors de Bafoussam ?',
        answer:
          "Nous étudions les chantiers dans la Région de l'Ouest et au-delà selon la taille du projet. La distance et l'hébergement des équipes sont intégrés au devis.",
      },
    ],
    related: ['transport', 'commerce', 'services'],
  },
  {
    slug: 'services',
    seoTitle: 'Services, achats et approvisionnement',
    seoDescription:
      "Achat sur commande, approvisionnement régulier, regroupement et livraison à Bafoussam. Nous prenons en charge ce qui vous prend du temps, avec un suivi clair.",
    hero: {
      title: 'Ce qui vous prend du temps, <em>nous le prenons en charge.</em>',
      lede:
        "Achat sur commande, approvisionnement régulier, regroupement et livraison. Nous prenons en charge ce qui vous prend du temps.",
      caption: 'Au marché, avec nos partenaires.',
      image: 'fabric-portrait',
      imageAlt: 'Commerçante souriante entourée de tissus colorés',
      position: '50% 30%',
    },
    meta: [
      { label: 'Format', value: 'Ponctuel · Régulier' },
      { label: 'Périmètre', value: 'Achat · Logistique' },
      { label: 'Suivi', value: 'Un interlocuteur' },
    ],
    intro: {
      label: 'Le service',
      title: "Un service, c'est une <em>parole tenue.</em>",
      body: [
        "Il y a des tâches qui prennent du temps sans être votre métier : chercher une référence, comparer trois fournisseurs, regrouper des commandes, faire livrer à plusieurs endroits. Nous pouvons les prendre en charge.",
        "Notre service commence par un brief clair. Ce que vous attendez, ce que vous ne voulez pas, le budget et la date. Nous revenons avec une proposition concrète et nous exécutons ce qui a été validé.",
      ],
      points: [
        { label: 'Le brief', text: "Nous écrivons ce qui est demandé, ce qui est exclu et comment la réussite sera vérifiée." },
        { label: 'Le suivi', text: "Un interlocuteur suit la demande et vous informe des arbitrages nécessaires." },
        { label: 'Le compte rendu', text: "À la fin, vous savez ce qui a été acheté, livré ou fait, avec les justificatifs utiles." },
      ],
      mainImage: 'shopkeeper-portrait',
      mainAlt: 'Commerçant en chemise bleue dans sa boutique',
      insetImage: 'hardware-tools',
      insetAlt: 'Outils et articles de quincaillerie suspendus dans une boutique',
      stampLabel: '06 · Services',
      stampTitle: 'Achat & organisation',
      caption: 'Un réseau de fournisseurs, mobilisé pour votre demande.',
    },
    offers: {
      label: 'Les missions',
      title: 'Ce que nous prenons <em>en charge.</em>',
      intro:
        "Des missions ponctuelles ou récurrentes, toujours cadrées par un périmètre et un prix écrits.",
      items: [
        {
          title: 'Achat sur commande',
          text: "Vous avez une référence, un modèle ou une liste. Nous cherchons, comparons et achetons selon le budget et le délai convenus.",
          tags: ['Recherche', 'Comparaison', 'Achat'],
        },
        {
          title: 'Approvisionnement régulier',
          text: "Pour les commerces, chantiers et structures qui ont besoin des mêmes produits à intervalle régulier, avec un calendrier et un prix suivis.",
          tags: ['Récurrent', 'Calendrier', 'Prix'],
        },
        {
          title: 'Regroupement & livraison',
          text: "Nous regroupons plusieurs commandes ou fournisseurs, puis nous organisons la livraison à un ou plusieurs destinataires.",
          tags: ['Groupage', 'Livraison', 'Destinataires'],
        },
        {
          title: 'Conseil & accompagnement',
          text: "Nous aidons à clarifier un besoin, comparer des offres ou organiser un approvisionnement. Nous ne remplaçons pas un bureau d'études ou un professionnel habilité.",
          tags: ['Clarifier', 'Comparer', 'Organiser'],
        },
      ],
    },
    field: {
      label: 'Votre liste',
      title: 'Votre liste, <em>notre organisation.</em>',
      body: [
        "Une demande de service peut commencer par un message vocal, une photo ou une liste écrite. Nous la transformons en périmètre : ce qui est inclus, ce qui ne l'est pas, le budget et le délai.",
        "Si une demande sort de notre champ de compétence, nous le disons. Si un fournisseur ne peut pas tenir, nous proposons une alternative. Le service n'est pas de tout accepter ; c'est de tenir ce qui a été accepté.",
      ],
      points: [
        "Écrivez la demande avec le résultat attendu, pas seulement la tâche.",
        "Donnez un budget cible et une date réelle.",
        "Indiquez qui valide les achats et qui reçoit la livraison.",
      ],
      image: 'market-bananas',
      imageAlt: 'Vendeur de bananes sur un marché',
      caption: 'Produits frais regroupés pour une commande.',
    },
    process: {
      title: 'Une mission, <em>quatre temps.</em>',
      intro: "Un cadre simple pour éviter les malentendus et les allers-retours inutiles.",
      steps: [
        { number: '01', title: 'La demande', text: "Ce que vous voulez obtenir, pour quand et dans quel budget." },
        { number: '02', title: 'Le cadrage', text: "Périmètre, prix, délai, responsabilités et critères de validation." },
        { number: '03', title: "L'exécution", text: "Recherche, achat, regroupement ou livraison, avec information en cas d'écart." },
        { number: '04', title: 'Le compte rendu', text: "Ce qui a été fait, les justificatifs et les points à ajuster pour la prochaine fois." },
      ],
    },
    quote: "Servir, ce n'est pas promettre beaucoup. C'est tenir ce qui a été dit.",
    faqs: [
      {
        question: 'Quels types de services proposez-vous ?',
        answer:
          "Achat sur commande, approvisionnement régulier, regroupement de commandes, livraison et accompagnement dans l'organisation d'un approvisionnement. Le périmètre exact est écrit avant le démarrage.",
      },
      {
        question: 'Y a-t-il un montant minimum ?',
        answer:
          "Cela dépend de la nature de la mission et du déplacement nécessaire. Nous vous indiquons le minimum avant de commencer, avec le coût de recherche ou de livraison s'il s'applique.",
      },
      {
        question: 'Mes informations sont-elles confidentielles ?',
        answer:
          "Oui. Les listes, budgets et coordonnées transmis dans le cadre d'une mission ne sont utilisés que pour la mission. Nous ne partageons pas vos données avec des tiers non concernés.",
      },
      {
        question: 'Que se passe-t-il si le délai ne peut pas être tenu ?',
        answer:
          "Nous vous prévenons dès que l'information est fiable, avec la cause et une nouvelle date. Si l'écart change le coût ou l'intérêt de la mission, vous pouvez l'arrêter ou l'ajuster par écrit.",
      },
      {
        question: 'Comment la prestation est-elle facturée ?',
        answer:
          "Selon la mission : prix forfaitaire, frais de service ou marge convenue sur les achats. Le mode de facturation et les éventuels frais sont précisés avant de commencer.",
      },
    ],
    related: ['commerce', 'import-export', 'transport'],
  },
];

export const divisionPageBySlug = Object.fromEntries(
  divisionPages.map((page) => [page.slug, page]),
);
