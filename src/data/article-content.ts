export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string };

export type ArticleContent = {
  slug: string;
  intro: string;
  blocks: ArticleBlock[];
  takeaways: string[];
};

export const articleContents: ArticleContent[] = [
  {
    slug: 'le-prix-affiche-est-le-prix-paye',
    intro:
      "C'est la phrase la plus simple de nos engagements, et peut-être la plus difficile à tenir. Elle ne parle pas seulement d'un montant affiché. Elle parle de la manière dont une maison décide de gagner sa vie.",
    blocks: [
      {
        type: 'p',
        text: "Un client arrive au comptoir, demande un sac de riz, un carton de savon ou un lot de tôles. Il connaît le prix annoncé. Il a préparé son argent. Au moment de payer, on lui ajoute « les frais de transport », « le conditionnement » ou « le service ». Le prix a changé entre la question et la réponse. C'est précisément ce que nous refusons.",
      },
      { type: 'h2', text: 'Un prix, trois moments' },
      {
        type: 'p',
        text: "Un prix passe par trois moments : l'affichage, le devis et le paiement. Notre règle est que ces trois moments disent la même chose. Le montant annoncé en rayon ou dans une conversation est celui qui figure sur le devis. Le devis validé est celui qui est encaissé. S'il doit changer, le changement est annoncé avant, jamais découvert après.",
      },
      {
        type: 'p',
        text: "Cette continuité paraît évidente. Elle demande pourtant une discipline de tous les instants : vérifier le coût du transport avant de donner un prix, intégrer le conditionnement dès le départ, refuser de compenser une erreur de calcul par un frais surprise.",
      },
      { type: 'h2', text: 'Pourquoi les frais apparaissent' },
      {
        type: 'p',
        text: "Les coûts existent réellement. Transporter un sac de ciment jusqu'à un chantier coûte quelque chose. Emballer un lot fragile, mobiliser un véhicule, payer une manutention : ce ne sont pas des inventions. Le problème n'est pas le coût. Le problème est le moment où il apparaît.",
      },
      {
        type: 'p',
        text: "Un prix d'appel qui ignore le transport est plus séduisant qu'un prix complet. Il attire la comparaison, puis se rattrape à la caisse. Nous préférons un prix complet, moins spectaculaire, qui permet au client de décider en connaissance de cause.",
      },
      { type: 'h2', text: 'Notre règle, en pratique' },
      {
        type: 'ul',
        items: [
          "Le prix annoncé est un prix complet pour le périmètre convenu. Si la livraison est incluse, elle est incluse. Si elle ne l'est pas, c'est écrit.",
          "Le devis distingue la marchandise, le transport, la manutention et les services. Un total unique ne suffit pas.",
          "Un changement de coût est signalé avant la commande. Une fois la commande confirmée, le prix ne bouge pas sans accord écrit.",
          "Le reçu ou la facture reprend les lignes validées. Vous pouvez vérifier ce que vous avez payé.",
        ],
      },
      {
        type: 'p',
        text: "Il arrive qu'un coût ne puisse pas être confirmé à l'avance : une variation de change, un tarif de fret qui dépend du volume final, une taxe qui évolue. Dans ce cas, nous l'indiquons comme une estimation, avec la règle de calcul. Vous savez ce qui est ferme et ce qui reste à confirmer.",
      },
      { type: 'h2', text: 'Ce que cela change pour vous' },
      {
        type: 'p',
        text: "Un prix complet permet de budgéter. Il permet aussi de comparer ce qui est comparable. Deux offres ne se valent pas si l'une inclut le transport et l'autre non. En rendant les lignes visibles, nous vous donnons les moyens de choisir, pas seulement de payer.",
      },
      {
        type: 'p',
        text: "Cela change également la relation. Un client qui découvre un frais caché apprend à se méfier. Un client qui reçoit le prix annoncé apprend qu'il peut revenir. La confiance ne se déclare pas ; elle se vérifie sur des petites sommes, plusieurs fois.",
      },
      { type: 'h2', text: 'Ce que cela nous coûte' },
      {
        type: 'p',
        text: "Cette règle nous coûte parfois une vente. Un concurrent peut annoncer un prix plus bas parce qu'il n'a pas intégré le transport. Nous perdons la comparaison rapide. Nous gagnons une conversation plus honnête, et parfois un client qui revient une fois le premier malentendu évité.",
      },
      {
        type: 'p',
        text: "Elle nous oblige aussi à mieux calculer. Nous devons anticiper les coûts, négocier les transports, vérifier les quantités. Une marge claire est une marge qui résiste à la réalité. Une marge cachée finit toujours par apparaître quelque part.",
      },
      {
        type: 'quote',
        text: "Un prix qui change à la caisse n'est pas un prix. C'est une surprise.",
      },
      { type: 'h2', text: 'Comment vérifier, même ailleurs' },
      {
        type: 'p',
        text: "Cette exigence ne devrait pas être réservée à notre maison. Avant de confirmer une commande, posez quatre questions simples : quel est le prix total rendu ? Qu'est-ce qui est inclus ? Quelle est l'unité exacte ? Que se passe-t-il si la quantité ou le délai change ?",
      },
      {
        type: 'p',
        text: "Demandez la réponse par écrit, même par message. Un prix qui n'est pas écrit reste une intention. Un prix écrit, avec son périmètre, devient un engagement que vous pouvez vérifier. C'est mieux pour vous, et c'est plus clair pour nous.",
      },
    ],
    takeaways: [
      "Le prix annoncé, le devis et le paiement doivent dire la même chose.",
      "Le transport et la manutention font partie du prix, pas d'un supplément surprise.",
      "Un changement de coût s'annonce avant la commande, jamais après.",
      "Demandez toujours le prix rendu et le périmètre inclus par écrit.",
    ],
  },
  {
    slug: 'acheter-en-gros-a-bafoussam',
    intro:
      "Une commande en gros se joue avant le camion. C'est dans les questions posées au départ — l'unité, la qualité, le prix rendu, le délai — que se décide la tranquillité de la livraison.",
    blocks: [
      {
        type: 'p',
        text: "Acheter en gros ne consiste pas seulement à multiplier une quantité. C'est changer d'échelle : les unités, les conditionnements, les délais et les responsabilités ne sont plus les mêmes. Une approximation qui coûte quelques francs au détail peut coûter beaucoup plus sur une palette.",
      },
      { type: 'h2', text: '1. L’unité et le conditionnement' },
      {
        type: 'p',
        text: "Un sac de riz peut peser 25 ou 50 kilos. Un carton de savon peut contenir 12, 24 ou 48 pièces. Un tissu se vend au mètre, à la pièce ou au ballot. Avant de comparer les prix, il faut comparer les unités.",
      },
      {
        type: 'p',
        text: "Demandez aussi le poids net et le poids brut, le nombre d'unités par carton et la façon dont la marchandise est emballée. Un prix au kilo peut sembler meilleur simplement parce que l'emballage est plus léger. Ce n'est pas une bonne comparaison.",
      },
      { type: 'h2', text: '2. La qualité, nommée' },
      {
        type: 'p',
        text: "« Bon qualité » ne veut rien dire. Une marque, une origine, un calibre, un taux d'humidité, un tri : ce sont ces mots qui permettent de vérifier ce que vous recevez. Pour les produits frais, la saison et le délai de transport changent la qualité réelle.",
      },
      {
        type: 'p',
        text: "Quand c'est possible, demandez un échantillon ou une photo récente du lot. Pour un premier fournisseur, prévoyez un contrôle à la réception. La confiance se construit, elle ne se présume pas.",
      },
      { type: 'h2', text: '3. Le prix rendu' },
      {
        type: 'p',
        text: "Le prix départ n'est pas le prix final. Ajoutez le transport, la manutention, les éventuelles taxes et le coût du dernier kilomètre. Comparez ensuite les offres sur la même base : même produit, même quantité, même lieu de livraison.",
      },
      {
        type: 'p',
        text: "Si un fournisseur ne peut pas donner un prix rendu, demandez-lui de distinguer les lignes. Vous saurez au moins ce qui reste à votre charge. Un prix complet vaut mieux qu'un prix bas qui devient flou.",
      },
      { type: 'h2', text: '4. Le délai réel' },
      {
        type: 'p',
        text: "Il y a le délai annoncé et le délai possible. Entre les deux, il y a le stock, la production, le chargement, la route et la réception. Demandez si la marchandise est disponible immédiatement ou si elle doit être commandée.",
      },
      {
        type: 'p',
        text: "Pour une commande qui alimente un chantier ou un commerce, une livraison partielle peut être préférable à une livraison complète en retard. Posez la question avant : est-ce que je peux recevoir une première partie, et à quelle date ?",
      },
      { type: 'h2', text: '5. Les conditions de paiement' },
      {
        type: 'p',
        text: "Acompte, paiement à la livraison, solde après contrôle : les conditions doivent être écrites. Demandez un reçu pour chaque versement et vérifiez que le montant correspond au devis validé.",
      },
      {
        type: 'p',
        text: "Méfiez-vous des demandes de paiement qui changent de destinataire ou de compte sans explication. Une maison sérieuse ne modifie pas ses coordonnées de paiement par simple message, sans confirmation.",
      },
      { type: 'h2', text: '6. Le recours' },
      {
        type: 'p',
        text: "Que se passe-t-il si la quantité est inférieure, si l'emballage est abîmé ou si la qualité ne correspond pas ? La réponse doit être connue avant la commande. À la réception, vérifiez, comptez, photographiez et notez l'écart sur le bon de livraison si possible.",
      },
      {
        type: 'p',
        text: "Un recours n'est pas une accusation. C'est une procédure. Elle est plus simple quand les deux parties savent ce qui était commandé et ce qui a été livré.",
      },
      { type: 'h2', text: 'La checklist avant de dire oui' },
      {
        type: 'ul',
        items: [
          "Le produit est décrit par une référence, une marque ou un échantillon.",
          "L'unité, le conditionnement et la quantité sont écrits.",
          "Le prix rendu et les lignes incluses sont précisés.",
          "Le délai est une date ou une fourchette, pas une impression.",
          "Les conditions de paiement et les reçus sont prévus.",
          "Le lieu et la personne qui reçoit sont confirmés.",
          "La procédure en cas d'écart est connue.",
          "Le devis et les échanges sont conservés.",
        ],
      },
      {
        type: 'quote',
        text: "Une commande claire au départ évite une négociation difficile à l'arrivée.",
      },
      {
        type: 'p',
        text: "Ces questions prennent quelques minutes. Elles évitent souvent des semaines de malentendus. Si un fournisseur refuse de les mettre par écrit, ce refus est déjà une information.",
      },
    ],
    takeaways: [
      "Comparez toujours les offres sur la même unité et le même conditionnement.",
      "Le prix rendu inclut le transport et la manutention, pas seulement la marchandise.",
      "Demandez une date réaliste et, si nécessaire, une livraison partielle.",
      "Écrivez la procédure de recours avant de payer, pas après la livraison.",
    ],
  },
  {
    slug: 'maranatha-ce-que-le-mot-veut-dire',
    intro:
      "Maranatha est un mot ancien, court, que l'on prononce parfois sans savoir ce qu'il porte. Nous l'avons choisi pour une raison simple : il nous rappelle que le travail se fait sous un regard plus grand que celui du marché.",
    blocks: [
      {
        type: 'p',
        text: "Le nom d'une maison n'est pas seulement une étiquette. Il accompagne les conversations, les devis, les livraisons et les jours difficiles. Il finit par poser une question : ce que nous faisons est-il digne de ce nom ?",
      },
      { type: 'h2', text: 'Un mot araméen' },
      {
        type: 'p',
        text: "« Maranatha » vient de l'araméen, une langue parlée au temps de Jésus. On le trouve à la fin de la première lettre aux Corinthiens : « Marana tha » — « Notre Seigneur, viens » ou, selon la lecture, « Le Seigneur vient ». L'Église primitive l'utilisait comme une prière brève, presque un cri.",
      },
      {
        type: 'p',
        text: "Le mot est court parce qu'une prière n'a pas besoin d'être longue pour être vraie. Il dit à la fois une attente et une présence : quelque chose vient, quelqu'un vient. Cette tension entre l'attente et la venue accompagne aussi le travail quotidien.",
      },
      { type: 'h2', text: 'Une prière, pas un slogan' },
      {
        type: 'p',
        text: "Nous n'utilisons pas « Maranatha » comme un argument commercial. Ce n'est pas une garantie automatique de qualité, ni un label qui dispenserait de faire correctement son travail. Ce serait même le contraire : un nom qui appelle à la vigilance.",
      },
      {
        type: 'p',
        text: "Une maison qui porte ce nom ne peut pas se permettre de cacher un prix, de livrer une quantité inférieure ou de promettre un délai qu'elle ne peut pas tenir. Le nom ne remplace pas la rigueur. Il la rend plus nécessaire.",
      },
      { type: 'h2', text: 'Ce que cela change dans le commerce' },
      {
        type: 'p',
        text: "Dans une économie où la confiance est parfois rare, la tentation est de gagner sur chaque détail : un sac un peu plus léger, une qualité un peu moins bonne, un frais ajouté à la fin. Ces petits écarts semblent sans conséquence. Ils construisent pourtant une réputation.",
      },
      {
        type: 'p',
        text: "La crainte de Dieu, telle que nous la comprenons, n'est pas une peur qui paralyse. C'est une conscience : ce qui n'est pas vu par le client reste vu. Cette conscience ne rend pas parfait, mais elle rend attentif. Elle oblige à vérifier, à dire vrai et à corriger.",
      },
      { type: 'h2', text: 'Le juste prix, la même balance' },
      {
        type: 'p',
        text: "Le nom « Le Juste Prix » vient de Proverbes 11:1 : « La balance fausse est en horreur à l'Éternel, mais le poids juste lui est agréable. » Une balance juste ne favorise personne. Elle indique le poids réel, même quand il dérange.",
      },
      {
        type: 'p',
        text: "Dans le commerce, la balance peut prendre plusieurs formes : un prix qui ne change pas à la caisse, une quantité qui correspond à ce qui est annoncé, un devis qui distingue les lignes. Ce sont des gestes ordinaires. C'est là que la parole se vérifie.",
      },
      {
        type: 'quote',
        text: "Un nom ne rend pas une maison juste. C'est la manière de peser, chaque jour, qui le devient.",
      },
      { type: 'h2', text: 'Une parole qui reste' },
      {
        type: 'p',
        text: "Nous ne prétendons pas être une maison parfaite. Nous avons des contraintes, des erreurs et des jours où tout ne se passe pas comme prévu. Mais nous voulons que notre nom nous rappelle la direction : dire ce qui est vrai, tenir ce qui est promis, réparer ce qui est cassé.",
      },
      {
        type: 'p',
        text: "Maranatha n'est donc pas un slogan posé au-dessus d'une porte. C'est une prière qui accompagne le travail, et une manière de se souvenir que ce que nous faisons ne reste pas caché.",
      },
    ],
    takeaways: [
      "« Maranatha » est un mot araméen qui signifie « Notre Seigneur, viens » ou « Le Seigneur vient ».",
      "Le nom est une prière, pas une garantie commerciale automatique.",
      "« Le Juste Prix » vient de Proverbes 11:1 et appelle à une balance honnête.",
      "La fidélité au nom se vérifie dans des gestes ordinaires, pas dans un slogan.",
    ],
  },
  {
    slug: 'importer-sans-mauvaise-surprise',
    intro:
      "Importer comporte des risques qui ne disparaissent pas avec une promesse. Ils se réduisent avec des questions précises, posées avant de payer et écrites avant de partir.",
    blocks: [
      {
        type: 'p',
        text: "Une importation réussie ne se mesure pas seulement à l'arrivée d'un conteneur. Elle se mesure à la conformité de la marchandise, au coût final et à la capacité de savoir qui répond quand quelque chose ne va pas. Ces trois éléments se préparent avant le départ.",
      },
      { type: 'h2', text: '1. Quel est le prix rendu ?' },
      {
        type: 'p',
        text: "Le prix du fournisseur n'est que le début. Il faut ajouter le fret, l'assurance si elle est retenue, les formalités douanières, la manutention portuaire, le transport local et parfois le stockage. Le prix rendu est celui qui compte pour votre budget.",
      },
      {
        type: 'p',
        text: "Demandez une proposition qui distingue ces lignes. Si une ligne est estimée, demandez sur quelle base. Un coût variable n'est pas un problème en soi ; un coût caché en est un.",
      },
      { type: 'h2', text: '2. Qui s’occupe du fret et de la douane ?' },
      {
        type: 'p',
        text: "Il est facile de supposer que l'autre s'en occupe. Il est plus sûr de l'écrire. Qui choisit le transitaire ? Qui prépare les documents ? Qui paie les droits et taxes ? Qui suit la mainlevée ? Qui vous prévient si un document manque ?",
      },
      {
        type: 'p',
        text: "Les responsabilités réglementaires restent celles des acteurs habilités. Si vous travaillez avec un commissionnaire ou un transitaire, vérifiez son rôle exact. Une bonne coordination ne remplace pas une habilitation.",
      },
      { type: 'h2', text: '3. Quelles vérifications à l’arrivée ?' },
      {
        type: 'p',
        text: "À la réception, vérifiez la quantité, l'emballage et la conformité apparente. Comptez les colis, comparez avec le bon de livraison, photographiez les écarts. Pour une marchandise fragile ou de valeur, une inspection plus poussée peut être nécessaire avant de signer la réception.",
      },
      {
        type: 'p',
        text: "Un écart constaté à l'arrivée se traite plus facilement qu'un écart découvert une semaine plus tard, après que l'emballage a été jeté et que la marchandise a été mélangée au stock.",
      },
      { type: 'h2', text: '4. Quel délai est réaliste ?' },
      {
        type: 'p',
        text: "Un délai se compose : production chez le fournisseur, préparation des documents, transport international, dédouanement, livraison locale. Chaque étape peut prendre plus de temps que prévu. Une fourchette honnête vaut mieux qu'une date précise inventée.",
      },
      {
        type: 'p',
        text: "Demandez ce qui se passe si le navire est retardé ou si un document est incomplet. Un importateur sérieux ne promet pas que rien n'arrivera ; il explique comment il réagira.",
      },
      { type: 'h2', text: '5. Que se passe-t-il en cas de retard ou d’avarie ?' },
      {
        type: 'p',
        text: "La réponse doit être écrite avant la commande : qui constate, qui déclare, qui traite avec le transporteur ou l'assureur, dans quel délai. Pour une marchandise de valeur, l'assurance n'est pas un détail. Vérifiez ce qui est couvert et ce qui ne l'est pas.",
      },
      {
        type: 'p',
        text: "Conservez les photos, les bons de livraison, les échanges et les documents de transport. Un recours sans preuve est une conversation difficile. Un recours documenté est un dossier.",
      },
      { type: 'h2', text: 'Les documents à garder' },
      {
        type: 'ul',
        items: [
          "La facture proforma et la facture commerciale.",
          "La liste de colisage avec les quantités et les poids.",
          "Le document de transport : connaissement maritime ou lettre de transport aérien.",
          "Les documents douaniers et les preuves de paiement des droits.",
          "Le bon de livraison signé et les photos de réception.",
          "Les échanges écrits sur les écarts et les solutions proposées.",
        ],
      },
      {
        type: 'quote',
        text: "Importer sans surprise, ce n'est pas éviter les imprévus. C'est savoir à l'avance qui les traite.",
      },
      {
        type: 'p',
        text: "Ces questions ne suppriment pas le risque. Elles le rendent visible et partageable. C'est déjà beaucoup : un dossier clair se défend mieux qu'une promesse floue.",
      },
    ],
    takeaways: [
      "Comparez sur le prix rendu, toutes lignes comprises.",
      "Écrivez qui gère le fret, la douane et le dernier kilomètre.",
      "Contrôlez la marchandise à l'arrivée et documentez tout écart.",
      "Une fourchette de délai honnête vaut mieux qu'une date inventée.",
      "Gardez tous les documents jusqu'à la réception définitive.",
    ],
  },
];

export const articleContentBySlug = Object.fromEntries(
  articleContents.map((content) => [content.slug, content]),
);
