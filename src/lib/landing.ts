/**
 * Landing page copy & data — single source of truth (FR).
 * PT-PT and EN dictionaries live in landing-i18n.ts and share this shape.
 */

export const CALENDLY_URL =
  "https://calendly.com/yass_automat-ia/new-meeting";

export const SITE_URL = "https://www.botflow-ia.fr";

export const AUDIT_LABEL = "Réserver mon audit gratuit (30 min)";

export const copy = {
  nav: {
    brand: "BotFlow.IA",
    links: [
      { label: "Sofia", href: "#solution" },
      { label: "Offres", href: "#offres" },
      { label: "Résultats", href: "#resultats" },
      { label: "Tarifs", href: "#tarifs" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Audit gratuit",
  },

  hero: {
    badge: "2 places d'onboarding disponibles ce mois-ci",
    h1Line1: "Chaque DM,",
    h1Accent: "même à 22 h,",
    h1Line2: "devient un rendez-vous.",
    sub: "BotFlow IA installe Sofia, votre assistante IA bilingue FR · PT · EN. Elle répond 24/7 sur WhatsApp et Instagram, qualifie vos clientes, réserve dans Planity ou Treatwell, relance les no-show et fait revenir vos anciennes clientes.",
    ctaPrimary: AUDIT_LABEL,
    ctaSecondary: "Découvrir Sofia",
    compliance: "Conforme RGPD · Hébergement 100 % Europe",
  },

  trust: {
    label: "Connecté aux outils de votre clinique",
    headline: "Planity, Treatwell, Zolmi, WhatsApp, Instagram.",
    sub: "Sécurisé RGPD, hébergé en Europe.",
    tools: [
      "Planity",
      "Treatwell",
      "Zolmi",
      "Booksy",
      "Doctolib Pro",
      "Phorest",
      "WhatsApp Business",
      "Instagram DM",
    ],
  },

  problem: {
    eyebrow: "Ce que vous perdez chaque mois",
    title: "Chaque DM ignoré, c'est un rendez-vous",
    titleAccent: "chez la concurrente.",
    items: [
      {
        stat: "68 %",
        statLabel: "des DM hors horaires restent sans réponse",
        title: "Les DM de 22 h",
        body: "Une cliente écrit après son travail. Pas de réponse avant le lendemain midi — elle a déjà réservé ailleurs. Sur ~80 demandes Instagram par mois, seules 10 à 15 deviennent des rendez-vous.",
      },
      {
        stat: "15–20 %",
        statLabel: "de no-show sur un agenda non confirmé",
        title: "Les no-show silencieux",
        body: "Un créneau Hydrafacial vide à 14 h ne se rattrape jamais. À 15–20 % de no-show, une clinique 3 praticiens laisse plusieurs milliers d'euros par mois s'évaporer.",
      },
      {
        stat: "6 mois",
        statLabel: "sans relance = cliente perdue",
        title: "Les clientes dormantes",
        body: "Madame Garcia n'est pas revenue depuis 5 mois. Personne n'a le temps de la relancer. Sans suivi, la majorité des clientes ponctuelles ne reprennent jamais rendez-vous.",
      },
    ],
    closing:
      "Pendant ce temps, votre équipe est en cabine — c'est son métier. Répondre à minuit, confirmer, relancer : c'est celui de Sofia.",
  },

  solution: {
    eyebrow: "Comment Sofia travaille",
    title: "De la cliente curieuse",
    titleAccent: "au rendez-vous confirmé.",
    steps: [
      {
        icon: "💬",
        title: "DM / WhatsApp",
        body: "Une cliente écrit à 22 h",
      },
      {
        icon: "✨",
        title: "Sofia répond",
        body: "En FR, PT ou EN — qualifie le soin, le budget, l'urgence",
      },
      {
        icon: "📅",
        title: "RDV réservé",
        body: "Lien Planity / Treatwell envoyé, créneau confirmé",
      },
      {
        icon: "🔔",
        title: "Relances auto",
        body: "Confirmation J-1 et H-2, relance no-show sous 30 min",
      },
      {
        icon: "⭐",
        title: "Avis Google",
        body: "Demande d'avis à J+3, réactivation à M+3",
      },
    ],
  },

  offers: {
    eyebrow: "Nos 4 offres",
    title: "Le système complet pour",
    titleAccent: "remplir votre agenda en pilote auto.",
    items: [
      {
        num: "01",
        title: "Sofia — Agent d'accueil 24/7",
        benefit: "Plus aucun DM sans réponse, même le dimanche à minuit.",
        body: "Sofia répond sur Instagram et WhatsApp, connaît vos soins, vos tarifs et vos contre-indications, et envoie le lien de réservation connecté à votre agenda Planity ou Treatwell.",
      },
      {
        num: "02",
        title: "Visibilité IA Locale (AEO)",
        benefit: "Quand on demande « meilleure clinique près de chez moi » à ChatGPT, c'est vous.",
        body: "Vos clientes ne cherchent plus sur Google : elles demandent à ChatGPT, Perplexity ou Apple Intelligence. On optimise vos données pour que les IA recommandent votre établissement.",
      },
      {
        num: "03",
        title: "Machine à Contenus Instagram / TikTok",
        benefit: "5 posts par semaine, sans agence créa ni soirées montage.",
        body: "Vous prenez la photo avant/après, remplissez un mini-formulaire. L'IA génère script vidéo, légende et hashtags locaux en 2 minutes.",
      },
      {
        num: "04",
        title: "Réactivation & Suivi Client",
        benefit: "Vos trous d'agenda se comblent tout seuls.",
        body: "Sofia scanne votre base clientes et relance celles qui doivent revenir (Hydrafacial M+3, soin M+1). À J+3, elle prend des nouvelles et demande un avis Google.",
      },
    ],
  },

  process: {
    eyebrow: "Notre procédé",
    title: "De l'audit au déploiement,",
    titleAccent: "sans rien casser.",
    steps: [
      {
        num: "01",
        title: "Audit gratuit — 30 min",
        body: "On comprend votre clinique, vos soins, vos sources de leads. On calcule ensemble le CA que vous perdez en no-show et DM ignorés.",
      },
      {
        num: "02",
        title: "Cartographie",
        body: "Analyse de vos flux : Instagram, Planity, Treatwell, base clientes. On identifie les fuites de CA prioritaires.",
      },
      {
        num: "03",
        title: "Entraînement de Sofia",
        body: "Sofia apprend votre carte de soins, vos tarifs, vos contre-indications, votre ton. Connexion WhatsApp Business, Instagram et votre agenda.",
      },
      {
        num: "04",
        title: "Déploiement en 14 jours",
        body: "Mise en production progressive (10 % du trafic → 100 %), formation de votre équipe en 1 h, dashboard de suivi.",
      },
      {
        num: "05",
        title: "Pilotage continu",
        body: "Suivi mensuel des KPI : RDV générés, € récupérés, satisfaction. Sofia évolue avec vos nouveaux soins et vos saisons.",
      },
    ],
  },

  results: {
    eyebrow: "Résultats moyens constatés",
    title: "Ce que nos cliniques observent",
    titleAccent: "après 30 jours.",
    disclaimer:
      "Moyennes observées chez nos cliniques équipées — les résultats varient selon l'établissement et ne sont jamais garantis.",
    stats: [
      { value: 82, prefix: "−", suffix: " %", label: "de no-show" },
      { value: 34, prefix: "+", suffix: " %", label: "de RDV qualifiés depuis Instagram" },
      { value: 15, prefix: "−", suffix: " h", label: "par semaine au secrétariat" },
      { value: 27, prefix: "", suffix: " j", label: "de ROI moyen sur le setup" },
    ],
    casesLabel:
      "Cas représentatifs — scénarios types construits à partir des résultats moyens constatés, anonymisés.",
    cases: [
      {
        tag: "Sofia · WhatsApp & Insta",
        place: "Médecine esthétique · Paris",
        title: "Clinique 3 praticiens — les DM de nuit convertissent",
        body: "Sofia répond en FR et PT, qualifie les demandes (botox, peeling, Hydrafacial) et envoie le lien Planity.",
        kpis: [
          { v: "×3", l: "RDV depuis Instagram" },
          { v: "< 1 min", l: "temps de réponse" },
          { v: "22 h–7 h", l: "conversion nocturne" },
        ],
      },
      {
        tag: "Anti no-show",
        place: "Institut de beauté · Lisboa",
        title: "Institut bord de mer — no-show divisé par 5",
        body: "Confirmation WhatsApp J-1 et H-2, relance sous 30 min, liste d'attente intelligente : le créneau libéré est comblé en moins d'une heure.",
        kpis: [
          { v: "−82 %", l: "no-show" },
          { v: "+7 100 €", l: "récupérés / mois" },
          { v: "27 j", l: "ROI atteint" },
        ],
      },
      {
        tag: "Réactivation",
        place: "Clinique esthétique · Cascais",
        title: "Base clientes endormie — réveillée automatiquement",
        body: "Scan de la base : Hydrafacial M+3, botox M+4. Message personnalisé trilingue avec créneau direct.",
        kpis: [
          { v: "+38 %", l: "récurrence clientes" },
          { v: "×4", l: "avis Google / mois" },
          { v: "3 h", l: "gagnées / jour" },
        ],
      },
      {
        tag: "Machine à contenus",
        place: "Spa premium · Bordeaux",
        title: "De 0 à 5 posts par semaine, sans agence",
        body: "Photo avant/après + mini-formulaire → script vidéo, légende et hashtags générés en 2 minutes.",
        kpis: [
          { v: "×5", l: "volume de contenu" },
          { v: "+62 %", l: "reach Instagram" },
          { v: "2 min", l: "création / post" },
        ],
      },
    ],
  },

  pricing: {
    eyebrow: "Tarifs",
    title: "Trois packs,",
    titleAccent: "un seul objectif : votre agenda plein.",
    guarantee:
      "Garantie 30 jours satisfait ou remboursé sur le setup · Engagement 12 mois · Prix HT",
    packs: [
      {
        name: "Starter",
        tagline: "Sofia seule — l'essentiel pour ne plus rater un DM",
        setup: "1 990 €",
        monthly: "290 €",
        deploy: "Déploiement 14 jours",
        features: [
          "Sofia 24/7 sur WhatsApp & Instagram",
          "Qualification automatique des demandes",
          "Réservation Planity / Treatwell",
          "Relances no-show sous 30 min",
          "FR · PT · EN",
        ],
        featured: false,
      },
      {
        name: "Growth",
        tagline: "Sofia + visibilité IA + contenus — le moteur de croissance",
        setup: "3 990 €",
        monthly: "590 €",
        deploy: "Déploiement 21 jours",
        features: [
          "Tout le pack Starter",
          "Visibilité IA Locale (AEO)",
          "Machine à Contenus Instagram / TikTok",
          "5 posts générés / semaine",
          "Reporting mensuel",
        ],
        featured: true,
      },
      {
        name: "Full Stack",
        tagline: "Les 4 offres + bot vocal + dashboard BI",
        setup: "6 990 €",
        monthly: "990 €",
        deploy: "Déploiement 30–45 jours",
        features: [
          "Tout le pack Growth",
          "Réactivation & Suivi Client",
          "Bot vocal pour appels manqués",
          "Dashboard BI (CA récupéré, KPI)",
          "Pilotage prioritaire",
        ],
        featured: false,
      },
    ],
    note: "L'audit gratuit de 30 min sert justement à choisir le bon pack — venez avec vos chiffres, repartez avec un plan.",
  },

  faq: {
    eyebrow: "Questions fréquentes",
    title: "Tout savoir",
    titleAccent: "avant de démarrer.",
    sideText:
      "Vous gérez une clinique esthétique, un institut de beauté, un spa ou un cabinet de médecine esthétique ? Voici les questions qu'on nous pose le plus souvent. Pour le reste, l'audit gratuit de 30 min existe pour ça.",
    sideCta: "Réserver mon audit gratuit (30 min)",
    items: [
      {
        q: "Combien de temps pour déployer Sofia dans ma clinique ?",
        a: "Pack Starter (Sofia seule) : 14 jours. Pack Growth : 21 jours. Pack Full Stack : 30 à 45 jours. Chaque projet démarre par un audit gratuit de 30 minutes pour calculer vos pertes actuelles (no-show, DM non répondus) et fixer un calendrier réaliste. ROI moyen constaté : 27 jours.",
      },
      {
        q: "Est-ce compatible avec Planity, Treatwell ou Zolmi ?",
        a: "Oui. France : Planity, Treatwell, Doctolib Pro, Calenso. Portugal : Treatwell, Zolmi, Booksy, Phorest. Médecine esthétique : Logos, Julie, Veasy, OrisLine. Messagerie : WhatsApp Business API officielle et Instagram DM via l'API Meta. Si vous utilisez un autre outil, on vérifie la passerelle dès l'audit.",
      },
      {
        q: "Mes données clientes et photos avant/après sont-elles en sécurité ?",
        a: "Hébergement 100 % européen (Scaleway Paris, OVH Roubaix, Hetzner Allemagne). RGPD : DPA signé, registre des traitements, droit à l'oubli automatisé. Chiffrement WhatsApp de bout en bout et base AES-256. Photos avant/après : consentement écrit explicite, stockage chiffré. Vos données ne servent jamais à entraîner des modèles publics.",
      },
      {
        q: "Est-ce que Sofia parle portugais et anglais pour les touristes ?",
        a: "Oui — c'est même un argument majeur au Portugal. Français, portugais européen et anglais, avec détection automatique de la langue dès le premier message. Sofia répond dans la langue de la cliente, à Paris comme à Lisbonne ou Cascais.",
      },
      {
        q: "Combien ça coûte ?",
        a: "Starter : 1 990 € HT de setup + 290 € HT/mois. Growth : 3 990 € + 590 €/mois. Full Stack : 6 990 € + 990 €/mois. Engagement 12 mois, garantie 30 jours satisfait ou remboursé sur le setup. L'audit gratuit de 30 min — sans engagement — sert à choisir le bon pack.",
      },
      {
        q: "Sofia va-t-elle remplacer ma secrétaire ?",
        a: "Non. Sofia gère ce que votre équipe ne peut pas faire : répondre à 22 h un dimanche, qualifier 80 DM en parallèle, relancer les clientes inactives depuis 3 mois. Votre secrétaire accueille les patientes, gère les paiements et soigne la relation. Résultat : moins de stress, plus de rendez-vous.",
      },
      {
        q: "Et la déontologie médicale ?",
        a: "Nos scripts sont validés par un avocat santé/RGPD. Sofia ne fait aucune promesse de résultat (Art. R4127-13 du Code de la santé publique), aucun comparatif tarifaire public, mentionne les contre-indications et redirige tout cas complexe vers le praticien. En médecine esthétique régulée, validation finale avec votre praticien référent avant lancement.",
      },
      {
        q: "Quels résultats puis-je espérer le premier mois ?",
        a: "Résultats moyens constatés chez nos cliniques sur 30 jours : −82 % de no-show, +34 % de RDV qualifiés depuis Instagram, −15 h par semaine au secrétariat, ROI moyen en 27 jours. Ces chiffres sont des moyennes observées, jamais une garantie — votre audit chiffrera votre potentiel réel.",
      },
    ],
  },

  finalCta: {
    eyebrow: "Audit gratuit · 30 min · sans engagement",
    title: "Réservez votre audit gratuit,",
    titleAccent: "repartez avec votre plan chiffré.",
    sub: "30 minutes en visio. On calcule ensemble ce que votre clinique perd chaque mois en DM ignorés et no-show — et ce que Sofia peut récupérer. Garantie 30 jours satisfait ou remboursé sur le setup.",
    formTitle: "Vous préférez être recontactée ?",
    formSub: "Laissez-nous vos coordonnées — réponse sous 24 h ouvrées.",
  },

  form: {
    name: "Nom / Prénom",
    namePh: "Votre nom",
    email: "E-mail",
    emailPh: "vous@votreclinique.fr",
    establishment: "Type d'établissement",
    establishmentOptions: [
      "Clinique esthétique / médecine esthétique",
      "Institut de beauté",
      "Spa / centre bien-être",
      "Cabinet dermatologie esthétique",
      "Autre",
    ],
    practitioners: "Nombre de praticien(ne)s",
    practitionersOptions: ["Solo (1)", "2 à 3", "4 à 6", "7+"],
    message: "Votre douleur principale",
    messagePh:
      "Ex. : ~80 DM Instagram /mois mais seulement 12 RDV. 20 % de no-show…",
    submit: "Envoyer ma demande",
    success: "Merci ! Nous revenons vers vous sous 24 h ouvrées.",
    error:
      "Une erreur est survenue. Écrivez-nous directement : contact.botflow@gmail.com",
  },

  ui: {
    select: "Sélectionnez…",
    sending: "Envoi…",
    mostChosen: "Le plus choisi",
    emailLabel: "Email",
    locationLabel: "Localisation",
    legalLabel: "Légal",
    euHosting:
      "🇪🇺 Données hébergées en Europe — Scaleway · OVH · Hetzner — DPA signé, RGPD natif",
    openCalendar: "Ouvrir le calendrier de réservation ↗",
    calendarAria: "Calendrier de réservation de l'audit gratuit de 30 minutes",
    setupLabel: "HT setup",
    perMonth: "HT / mois",
  },

  footer: {
    cta: "Parlons-en.",
    email: "contact.botflow@gmail.com",
    location: "🇫🇷 Paris · 🇵🇹 Lisboa",
    legal: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Politique de confidentialité", href: "/politique-confidentialite" },
      { label: "CGV", href: "/cgv" },
    ],
    copyright: "© 2026 BotFlow IA — Tous droits réservés",
    compliance: "Conforme RGPD · Hébergement 100 % Europe · Art. R4127-13 CSP respecté",
  },
};

export type LandingCopy = typeof copy;
