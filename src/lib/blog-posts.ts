// Lightweight blog source. Add new posts here — automatically appears in sitemap + /blog index + /blog/[slug].
// Body uses limited inline JSX-safe markdown-ish structure rendered by the page component.

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readingMin: number;
  cluster: string;
  body: BlogBlock[];
  faq?: { q: string; a: string }[];
};

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "cta"; href: string; label: string };

export const posts: BlogPost[] = [
  {
    slug: "whatsapp-business-clinique-esthetique-rgpd",
    title: "WhatsApp Business pour cliniques esthétiques : guide d'installation conforme RGPD 2026",
    description:
      "Installer WhatsApp Business dans votre clinique esthétique sans risque RGPD : Business App vs Cloud API, vérification Meta, opt-in, templates approuvés, intégration Planity/Treatwell. Setup pas-à-pas.",
    date: "2026-05-19",
    readingMin: 11,
    cluster: "Réduction no-show",
    faq: [
      {
        q: "WhatsApp Business gratuit ou payant ?",
        a: "WhatsApp Business App (smartphone) est gratuit, mais limité à un seul appareil et sans automatisation avancée. WhatsApp Business Cloud API (la version pro pour cliniques) facture les conversations : environ 0,07 € par conversation initiée par l'entreprise (24h glissantes) et 0,03 € pour celles initiées par la cliente. Pour 500 conversations mensuelles, comptez 25 à 40 €/mois. Ajouter le coût du fournisseur d'accès (Twilio, 360dialog, Sinch) : 10 à 30 €/mois.",
      },
      {
        q: "Puis-je utiliser mon numéro personnel pour WhatsApp Business ?",
        a: "Non, c'est l'erreur la plus fréquente. Le numéro doit être dédié à l'entreprise et ne jamais avoir été utilisé sur WhatsApp Personnel. Risque sinon : suspension du compte par Meta sans préavis. Solution : numéro fixe géographique (01.../02...) ou mobile dédié activable via opérateur en 48h.",
      },
      {
        q: "Quelle base légale RGPD pour envoyer des messages WhatsApp à mes clientes ?",
        a: "Trois bases possibles selon le type de message. (1) Exécution d'un contrat : rappels de rendez-vous confirmés. (2) Intérêt légitime : relances de no-show, propositions de créneaux. (3) Consentement explicite : marketing, promotions, nouveautés. Toujours informer lors de la prise de rendez-vous (formulaire Planity, par exemple) et proposer un opt-out en 1 clic.",
      },
      {
        q: "Mes données clientes sortent-elles d'Europe avec WhatsApp Business ?",
        a: "Oui, Meta héberge en partie aux États-Unis. Pour les cliniques manipulant des données de santé sensibles (médecine esthétique, dermatologie), c'est un point d'attention. Solutions : (1) ne jamais faire transiter de données de santé dans le contenu des messages (préférer un lien sécurisé), (2) utiliser un BSP européen comme 360dialog ou Sinch qui contractualise des clauses RGPD renforcées, (3) tenir un registre des traitements à jour.",
      },
      {
        q: "Combien de temps prend le setup complet ?",
        a: "Configuration App seule : 30 minutes. Configuration Cloud API avec vérification Meta Business : 3 à 7 jours (vérification compte business + Facebook page + numéro). Intégration agenda (Planity, Treatwell) et premiers templates : 1 à 2 jours supplémentaires. Plan réaliste : 10 jours du démarrage au premier message envoyé en production.",
      },
      {
        q: "Quels templates de message Meta valide-t-elle pour cliniques esthétiques ?",
        a: "Meta approuve facilement les templates transactionnels (confirmation rendez-vous, rappel J-1, demande d'avis post-soin). Refus fréquents : promotions explicites (-20 % sur tous les soins), messages alarmistes (votre peau se dégrade), allégations médicales (traitement anti-âge garanti). Privilégier un ton informatif et concret. Validation moyenne en 24-48 h.",
      },
    ],
    body: [
      {
        type: "quote",
        text:
          "TL;DR — WhatsApp Business est devenu indispensable pour les cliniques esthétiques (98% d'ouverture en 3 min). Deux versions : App (gratuite, smartphone, limitée) et Cloud API (pro, automatisable, payante au message). Conformité RGPD = numéro dédié + base légale claire + opt-out + registre des traitements + BSP européen. Setup complet en 10 jours, premier message en production le 11e jour.",
      },
      { type: "h2", text: "1. Pourquoi WhatsApp Business est devenu critique en clinique esthétique" },
      {
        type: "p",
        text:
          "L'email est mort pour les rappels de rendez-vous. Taux d'ouverture moyen 22% en France, lu en moyenne 6 heures après réception, souvent jamais. Le SMS reste utile mais sans interaction : la cliente lit, oublie, ne peut pas répondre facilement. WhatsApp, lui, ouvre à 98% dans les 3 minutes et permet une conversation bidirectionnelle immédiate.",
      },
      {
        type: "p",
        text:
          "Pour une clinique esthétique, l'impact est triple : confirmation des rendez-vous (réduction no-show), reprogrammation 1 clic (récupération des annulations), nurturing prospects Instagram (qualification des DM en réservation). Une seule plateforme couvre la chaîne complète de la prise de contact à la fidélisation.",
      },
      { type: "h2", text: "2. WhatsApp Business App vs Cloud API : laquelle choisir" },
      {
        type: "p",
        text:
          "Meta propose deux produits sous le même nom. Confusion fréquente, conséquences sérieuses.",
      },
      { type: "h3", text: "WhatsApp Business App" },
      {
        type: "p",
        text:
          "Application gratuite installée sur le smartphone de la secrétaire ou de la praticienne. Pratique pour démarrer : profil professionnel, catalogue, réponses automatiques basiques. Limites : un seul appareil actif (multi-device limité à 4 secondaires), pas d'automatisation avancée, pas d'intégration directe avec Planity ou Treatwell. Convient à une clinique solo qui débute.",
      },
      { type: "h3", text: "WhatsApp Business Cloud API" },
      {
        type: "p",
        text:
          "Solution professionnelle hébergée chez Meta, accessible via un fournisseur d'accès (Business Solution Provider — BSP). Ouvre la voie à : multi-utilisateurs simultanés, automatisations conditionnelles, intégration native CRM/agenda, IA conversationnelle. Tarification à la conversation (environ 0,07 € par conversation initiée par l'entreprise). C'est le choix obligatoire dès qu'une clinique veut une vraie séquence J-3/J-1/H-2 automatisée.",
      },
      {
        type: "ul",
        items: [
          "App : 0 à 5 messages/jour, 1 utilisateur, démarrage solo.",
          "Cloud API : 10 à 1000+ messages/jour, multi-utilisateurs, automatisation, scale.",
          "Migration App → Cloud API : possible, conserve les conversations sous 90 jours, demande 5 à 7 jours de paramétrage.",
        ],
      },
      { type: "h2", text: "3. Choisir son BSP (Business Solution Provider) européen" },
      {
        type: "p",
        text:
          "Pour utiliser Cloud API, il faut passer par un BSP. C'est lui qui contractualise avec Meta, gère la facturation, fournit l'interface technique. Pour une clinique française ou portugaise, le critère #1 est la juridiction du BSP.",
      },
      { type: "h3", text: "BSP recommandés" },
      {
        type: "ul",
        items: [
          "360dialog (Allemagne) — choix recommandé pour la conformité RGPD. Tarif transparent, support FR/EN. Idéal cliniques 1-10 praticien(ne)s.",
          "Sinch (Suède) — alternative européenne robuste, plus orientée volume élevé.",
          "Twilio (États-Unis) — leader mondial, mais juridiction US. Acceptable si les données de santé ne transitent jamais dans les messages.",
          "MessageBird/Bird (Pays-Bas) — bonne option avec interface no-code et tarifs prévisibles.",
        ],
      },
      {
        type: "p",
        text:
          "Éviter les BSP basés hors UE qui ne contractualisent pas de clauses contractuelles types (CCT). Vérifier dans le contrat : (1) hébergement des métadonnées dans l'UE, (2) DPA fourni, (3) audit log accessible, (4) localisation du support technique.",
      },
      { type: "h2", text: "4. Conformité RGPD : les 4 piliers à valider" },
      { type: "h3", text: "Pilier 1 — Base légale claire" },
      {
        type: "p",
        text:
          "Pour chaque type de message, identifier la base légale. Rappels de rendez-vous confirmés = exécution du contrat. Relances no-show, propositions liste d'attente = intérêt légitime. Newsletter, promotions, lancements de soins = consentement explicite. Documenter cette répartition dans le registre des traitements.",
      },
      { type: "h3", text: "Pilier 2 — Information et consentement" },
      {
        type: "p",
        text:
          "Lors de la prise de rendez-vous (téléphone, Planity, Instagram), informer explicitement : « Nous utilisons WhatsApp Business pour les rappels et la gestion de votre rendez-vous. Vos données sont traitées en Europe. Vous pouvez vous désinscrire à tout moment en répondant STOP. » Ajouter ce paragraphe dans les CGV et la politique de confidentialité du site.",
      },
      { type: "h3", text: "Pilier 3 — Opt-out en 1 message" },
      {
        type: "p",
        text:
          "Toute conversation doit permettre le désabonnement. La cliente répond STOP, le système la sort immédiatement de toutes les séquences (rappels exclus si rendez-vous confirmé). Conserver la preuve technique du retrait dans les logs pendant 5 ans.",
      },
      { type: "h3", text: "Pilier 4 — Registre des traitements à jour" },
      {
        type: "p",
        text:
          "Mentionner WhatsApp Business dans le registre des traitements (obligation CNIL pour entreprises traitant des données régulièrement) : finalités, données collectées, durée de conservation, sous-traitants (Meta + BSP), transferts hors UE éventuels. Modèle gratuit fourni par la CNIL.",
      },
      { type: "h2", text: "5. Templates de message : ce que Meta valide" },
      {
        type: "p",
        text:
          "Tout message initié par l'entreprise (hors fenêtre de 24h après une interaction cliente) doit utiliser un template approuvé par Meta. Cette validation prend 24 à 48h.",
      },
      { type: "h3", text: "Templates approuvés facilement" },
      {
        type: "ul",
        items: [
          "Confirmation de rendez-vous (transactionnel, neutre, factuel).",
          "Rappel J-1 avec instructions de préparation.",
          "Notification de modification d'horaire à l'initiative de la clinique.",
          "Demande d'avis post-soin (sans incentive financier explicite).",
          "Proposition de créneau pour reprogrammation (réponse à une annulation).",
        ],
      },
      { type: "h3", text: "Templates souvent refusés" },
      {
        type: "ul",
        items: [
          "Promotions explicites (-20 % sur tous les soins ce week-end).",
          "Allégations médicales (traitement anti-âge garanti, effet immédiat sans risque).",
          "Messages alarmistes (votre peau se dégrade sans intervention).",
          "Marketing en série sans personnalisation (Bonjour à toutes).",
        ],
      },
      {
        type: "p",
        text:
          "Astuce : pour les promotions, passer par un template de notification générique (« Nouveau soin disponible chez X ») + lien vers page web où l'offre détaillée est présentée. Meta valide plus facilement.",
      },
      { type: "h2", text: "6. Intégration Planity, Treatwell et CRM" },
      {
        type: "p",
        text:
          "Le BSP fournit un webhook ou une API. La logique métier consiste à connecter cette API à votre agenda et à votre CRM via n8n, Make ou Zapier.",
      },
      {
        type: "p",
        text:
          "Flux typique pour une clinique : (1) Planity envoie un webhook « nouveau RDV » → n8n récupère les données cliente (nom, soin, date, praticienne), (2) n8n envoie un message WhatsApp template « Confirmation » via BSP, (3) à J-3, J-1 et H-2, n8n redéclenche des templates spécifiques, (4) si la cliente répond, le message arrive dans une interface unifiée (BSP ou Sofia) avec contexte CRM.",
      },
      {
        type: "p",
        text:
          "Connecteurs natifs disponibles : 360dialog s'intègre avec n8n via API REST documentée. Treatwell expose une API depuis 2023 (limitée mais suffisante pour les triggers RDV). Planity nécessite encore une intégration via un connecteur custom ou Zapier.",
      },
      { type: "h2", text: "7. Les 5 erreurs qui coûtent cher" },
      {
        type: "ol",
        items: [
          "Utiliser un numéro personnel — suspension Meta sans préavis, perte de l'historique. Toujours un numéro dédié.",
          "Oublier l'opt-out — risque CNIL : 1ère mise en demeure, jusqu'à 20 000 € en cas de récidive (PME) selon le RGPD.",
          "Stocker les conversations indéfiniment — durée de conservation à fixer (3 à 5 ans max pour la majorité des cas). Configurer la purge automatique.",
          "Marketing déguisé en transactionnel — Meta détecte (analyses sémantiques) et bannit. Restez factuel.",
          "Ne pas tester les templates avant production — 1 typo dans un rappel = mauvaise image. Tester avec 5 numéros internes avant rollout.",
        ],
      },
      { type: "h2", text: "8. Setup pas-à-pas : 10 étapes en 10 jours" },
      {
        type: "ol",
        items: [
          "Jour 1 — Acheter ou activer un numéro dédié (mobile ou fixe géographique).",
          "Jour 2 — Créer Meta Business Manager + page Facebook professionnelle + vérification entreprise.",
          "Jour 3 — Choisir un BSP (recommandé 360dialog pour la conformité). Souscrire un plan.",
          "Jour 4 — Le BSP demande à Meta l'accès Cloud API + vérifie le numéro (code SMS). 24-48h.",
          "Jour 5 — Rédiger les 6 premiers templates : confirmation, rappel J-3, rappel J-1, rappel H-2, relance no-show, reprogrammation. Soumettre à Meta.",
          "Jour 6-7 — Mettre à jour CGV + politique de confidentialité + formulaire Planity (mention opt-in WhatsApp). Mettre à jour le registre des traitements.",
          "Jour 8 — Recevoir validation Meta des templates. Tester avec 5 numéros internes (membres équipe + amis).",
          "Jour 9 — Configurer n8n ou Make : webhook Planity/Treatwell → API BSP. Tester end-to-end avec un faux rendez-vous.",
          "Jour 10 — Mise en production sur un type de soin pilote (par exemple Hydrafacial). Mesurer le taux d'ouverture et de réponse.",
          "Jour 11+ — Étendre à tous les soins, ajouter relance 30 min après no-show, activer liste d'attente intelligente.",
        ],
      },
      {
        type: "p",
        text:
          "Si vous voulez éviter ce parcours, Sofia (notre agent IA conversationnel) est livrée pré-intégrée avec 360dialog, templates validés, conformité RGPD documentée, et intégration Planity/Treatwell prête à l'emploi. Setup complet en 5 jours au lieu de 10.",
      },
      {
        type: "cta",
        href: "/solutions/no-show-killer",
        label: "Découvrir Sofia : WhatsApp Business clé-en-main pour cliniques esthétiques →",
      },
      { type: "h2", text: "Pour aller plus loin" },
      {
        type: "ul",
        items: [
          "Article pillar du cluster : « Comment réduire les no-show dans votre clinique esthétique » — méthode complète J-3/J-1/H-2.",
          "Cas client : « Comment Spa Marés a divisé ses no-show par 5 en 30 jours » (à paraître).",
        ],
      },
    ],
  },
  {
    slug: "reduire-no-show-clinique-esthetique",
    title: "Comment réduire les no-show dans votre clinique esthétique : guide complet 2026",
    description:
      "Les no-show coûtent en moyenne 18% du CA d'une clinique esthétique. Méthode complète 2026 : confirmation WhatsApp J-3/J-1/H-2, reprogrammation 1 clic, liste d'attente IA, relance sous 30 min. Cas pratique chiffré.",
    date: "2026-05-19",
    readingMin: 14,
    cluster: "Réduction no-show",
    faq: [
      {
        q: "Quel est le taux de no-show moyen en clinique esthétique ?",
        a: "Le taux moyen constaté en France et au Portugal est de 12 à 22% selon le type de soin et la clientèle. La médecine esthétique (botox, injections) tourne autour de 8-14%, les soins instituts (Hydrafacial, peelings) entre 15 et 22%, et les premières consultations entre 20 et 30%. Au-delà de 15%, le manque à gagner devient critique.",
      },
      {
        q: "Pourquoi WhatsApp marche mieux que SMS ou email pour les rappels ?",
        a: "Le taux d'ouverture WhatsApp est de 98% dans les 3 minutes, contre 20-30% pour l'email et 70% pour le SMS. Surtout, WhatsApp permet une conversation bidirectionnelle : la cliente peut confirmer, déplacer ou annuler en un message, sans appeler. C'est cette friction réduite qui transforme un rappel passif en interaction active.",
      },
      {
        q: "Est-ce conforme RGPD d'envoyer des rappels WhatsApp à mes clientes ?",
        a: "Oui, à condition d'avoir une base légale (intérêt légitime ou consentement explicite), d'informer la cliente lors de la prise de rendez-vous, et d'utiliser WhatsApp Business API (pas WhatsApp personnel). Un opt-out simple doit être proposé. La CNIL a confirmé en 2024 que les rappels de rendez-vous médicaux sont couverts par l'intérêt légitime.",
      },
      {
        q: "Combien coûte un système anti no-show automatisé ?",
        a: "Pour une clinique de 1 à 5 praticien(ne)s, comptez un investissement initial entre 1 200 et 3 500 € (paramétrage + intégration agenda + scénarios IA) puis 80 à 200 €/mois (licences, messages WhatsApp Business, monitoring). ROI moyen atteint dès le 2e mois : si vous évitez 1 no-show sur 2 et qu'un rendez-vous moyen vaut 180 €, l'outil est largement rentabilisé.",
      },
      {
        q: "La cliente peut-elle reprogrammer toute seule en 1 clic ?",
        a: "Oui, c'est la clé du système. Le rappel envoyé 48h avant inclut 3 boutons : Confirmer / Déplacer / Annuler. Si elle clique sur Déplacer, l'IA lui propose 3 créneaux compatibles avec son historique et l'agenda en temps réel. Validation en 2 messages. Aucun appel téléphonique, aucun email perdu.",
      },
      {
        q: "Que faire des créneaux libérés au dernier moment ?",
        a: "Un système de liste d'attente intelligente détecte les annulations et envoie automatiquement une proposition aux 3 à 5 clientes en attente, classées par priorité (récurrence, valeur, géolocalisation). Le créneau est attribué à la première qui valide. Taux de remplissage observé : 45 à 60% des créneaux annulés sont récupérés en moins d'une heure.",
      },
    ],
    body: [
      {
        type: "quote",
        text:
          "TL;DR — Les no-show coûtent en moyenne 18% du CA d'une clinique esthétique. Une stratégie en 5 piliers (confirmation WhatsApp séquencée J-3/J-1/H-2, reprogrammation en 1 clic, liste d'attente intelligente, relance sous 30 minutes, scoring clientes à risque) réduit le taux de no-show de 60 à 80% en 30 jours. ROI observé : payback en moins de 2 mois pour les cliniques de 1 à 5 praticien(ne)s.",
      },
      { type: "h2", text: "1. Combien vous coûtent vos no-show réellement" },
      {
        type: "p",
        text:
          "Avant de chercher une solution, mesurez le problème. La plupart des cliniques esthétiques sous-estiment leur taux de no-show et son coût réel. Voici le calcul honnête.",
      },
      {
        type: "p",
        text:
          "Prenez le nombre de rendez-vous prévus le mois dernier. Soustrayez ceux honorés. Divisez par le total. Si vous obtenez 15%, vous avez perdu 15% de votre capacité disponible. Sur une clinique qui facture 60 000 € par mois en théorie, ce sont 9 000 € qui s'évaporent.",
      },
      {
        type: "p",
        text:
          "Mais le coût caché va plus loin. Un créneau vide ce n'est pas seulement un soin non facturé, c'est aussi : le temps de votre secrétaire pour relancer (15-30 min par no-show), la frustration de l'esthéticienne préparée pour rien, la cabine inutilisée chauffée et éclairée, le matériel ouvert (Hydrafacial, peeling) parfois perdu. Comptez 1,3x à 1,5x le prix du soin pour avoir le coût total.",
      },
      {
        type: "h3",
        text: "Calculateur rapide",
      },
      {
        type: "ul",
        items: [
          "Nombre de rendez-vous par mois : ___",
          "Taux de no-show actuel (%) : ___",
          "Prix moyen d'un soin (€) : ___",
          "Coût caché par no-show (×1,4) : ___",
          "Manque à gagner mensuel = (RDV × no-show% × prix × 1,4)",
        ],
      },
      {
        type: "p",
        text:
          "Une clinique avec 400 rendez-vous mensuels, 18% de no-show et un prix moyen de 95 € perd environ 9 576 € par mois. Soit 115 000 € par an. C'est le salaire chargé d'une praticienne junior à temps plein.",
      },
      { type: "h2", text: "2. Les 7 causes principales du no-show en esthétique" },
      {
        type: "p",
        text:
          "Avant d'attaquer la solution technique, comprenez la psychologie. Les no-show ne sont pas un défaut moral des clientes, ce sont des défauts de système.",
      },
      {
        type: "ol",
        items: [
          "Oubli pur et simple — le rendez-vous a été pris 3 semaines plus tôt, sans rappel. Première cause, 40% des cas.",
          "Empêchement de dernière minute, sans canal facile pour reporter (la cliente ne veut pas appeler).",
          "Mauvaise estimation du temps de trajet ou du timing dans la journée.",
          "Conflit d'agenda avec une obligation professionnelle ou familiale apparue après la prise du rendez-vous.",
          "Peur ou anxiété pré-soin (notamment pour les premières injections ou laser) — la cliente reporte par évitement.",
          "Confusion sur la nature du rendez-vous (consultation vs soin, durée, préparation requise).",
          "Refroidissement de l'intérêt — entre la prise et le rendez-vous, 3 semaines passent, la motivation baisse.",
        ],
      },
      {
        type: "p",
        text:
          "Chacune de ces causes a une contre-mesure. La bonne nouvelle : ce sont toutes des problèmes de communication. Donc tous résolubles par la communication.",
      },
      { type: "h2", text: "3. Stratégie WhatsApp : confirmation J-3 / J-1 / H-2" },
      {
        type: "p",
        text:
          "Le rappel ne doit pas être une notification passive. C'est un rendez-vous à part entière, en trois temps, sur WhatsApp Business (taux d'ouverture 98% en 3 minutes vs 30% pour l'email).",
      },
      {
        type: "h3",
        text: "J-3 — Rappel doux + contexte",
      },
      {
        type: "p",
        text:
          "Trois jours avant, message court avec : nom du soin réservé, durée prévue, praticienne, adresse, temps de trajet estimé depuis le domicile (si vous avez l'info). Important : terminer par une question fermée → \"Confirmez-vous ?\" avec deux boutons Oui / Déplacer.",
      },
      {
        type: "quote",
        text:
          "Exemple — \"Bonjour Camille 👋 Petit rappel : votre Hydrafacial Deluxe (60 min) avec Sofia est prévu mercredi 22 mai à 14h30. On se retrouve au 12 rue de Provence, 75009 Paris. Confirmez-vous ?\"",
      },
      {
        type: "h3",
        text: "J-1 — Préparation soin + bouton 1 clic",
      },
      {
        type: "p",
        text:
          "La veille, second message avec instructions de préparation spécifiques au soin (pas de maquillage, pas d'exposition solaire 48h avant, hydratation, etc.). Joindre un visuel avant/après si pertinent. Cette étape n'est pas un rappel : c'est une preuve de professionnalisme qui réduit l'anxiété pré-soin.",
      },
      {
        type: "h3",
        text: "H-2 — Adresse + parking + photo cabine",
      },
      {
        type: "p",
        text:
          "Deux heures avant, message d'ancrage : adresse cliquable Google Maps, info parking ou métro le plus proche, photo de la façade ou de la cabine prête. Cette dernière touche transforme un rendez-vous abstrait en expérience visualisée. Effet psychologique : le no-show devient mentalement impossible.",
      },
      { type: "h2", text: "4. Reprogrammation en 1 clic vs appel téléphonique" },
      {
        type: "p",
        text:
          "La majorité des no-show ne sont pas des refus, ce sont des absences \"par défaut\". La cliente n'a pas annulé parce qu'annuler demande un effort (téléphoner aux heures d'ouverture, supporter une réception qui culpabilise, expliquer). Si vous lui donnez un bouton \"Déplacer\", elle clique.",
      },
      {
        type: "p",
        text:
          "Le système Sofia analyse l'historique de la cliente et son agenda actuel pour proposer 3 créneaux compatibles dans les 7 jours suivants. Elle choisit, le système confirme, l'agenda Planity ou Treatwell est mis à jour automatiquement. Pas d'appel, pas de friction, pas de no-show.",
      },
      {
        type: "ul",
        items: [
          "Taux de reprogrammation observé : 55 à 70% des annulations sont reprogrammées dans les 48h.",
          "Taux d'utilisation effectif du bouton 1 clic : 8 fois supérieur à celui d'un lien email standard.",
          "Délai moyen entre annulation et nouveau créneau confirmé : 4 minutes.",
        ],
      },
      { type: "h2", text: "5. Liste d'attente intelligente" },
      {
        type: "p",
        text:
          "Chaque créneau libéré au dernier moment est une opportunité de double conversion : récupérer le CA perdu et fidéliser une cliente qui attendait. La liste d'attente classique en cabinet (fichier Excel, secrétaire qui appelle) ne marche pas : trop lent.",
      },
      {
        type: "p",
        text:
          "L'IA, elle, agit en temps réel. Dès qu'une annulation arrive, le système identifie les 3 à 5 clientes en attente qui correspondent au type de soin, à la praticienne disponible et à la zone géographique. Un message automatique part avec proposition du créneau. La première qui clique valide récupère le slot.",
      },
      {
        type: "p",
        text:
          "Critères de priorité dans le scoring : récurrence (clientes fidèles d'abord), valeur (LTV élevée), urgence exprimée (mention \"dès que possible\" dans le dernier échange), proximité géographique (clientes à moins de 10 min).",
      },
      {
        type: "p",
        text:
          "Taux de remplissage observé : entre 45 et 60% des créneaux annulés sont récupérés en moins d'une heure. Sur une base annuelle, c'est l'équivalent de 2 à 3 mois de chiffre d'affaires supplémentaire retrouvés.",
      },
      { type: "h2", text: "6. Relance no-show sous 30 minutes" },
      {
        type: "p",
        text:
          "Malgré tous vos efforts, certains rendez-vous seront manqués. Ce qui suit fait la différence entre une cliente perdue et une cliente reprogrammée.",
      },
      {
        type: "p",
        text:
          "Dans les 30 minutes suivant l'heure du rendez-vous manqué, Sofia envoie un message empathique (jamais culpabilisant) : \"Tout va bien Camille ? On vous attendait à 14h30, je voulais m'assurer que rien de fâcheux n'est arrivé. Si vous souhaitez reprogrammer, voici 3 créneaux la semaine prochaine.\" Pas de reproche, pas d'amende sur la première offense, juste une porte ouverte.",
      },
      {
        type: "p",
        text:
          "Cas pratique : clinique Spa Marés (Lisboa, 3 praticien(ne)s, 320 rendez-vous/mois). Avant Sofia : 22% de no-show, aucune relance, 45% des clientes manquantes ne revenaient jamais. Après 30 jours : 4,5% de no-show grâce à la séquence WhatsApp, et 72% des clientes qui manquaient quand même étaient reprogrammées dans la semaine grâce à la relance 30 minutes. Effet net sur le CA mensuel : +14 200 €.",
      },
      { type: "h2", text: "7. Outils 2026 : Sofia et alternatives" },
      {
        type: "p",
        text:
          "Le marché propose plusieurs approches. Voici un panorama honnête, du moins efficace au plus complet.",
      },
      {
        type: "h3",
        text: "Niveau 1 — Rappels SMS automatiques (Planity, Treatwell)",
      },
      {
        type: "p",
        text:
          "Toutes les plateformes de réservation envoient un SMS de rappel. Taux d'ouverture moyen, pas d'interaction possible, pas de reprogrammation 1 clic. Réduction no-show typique : 10 à 20%. Utile comme base mais insuffisant.",
      },
      {
        type: "h3",
        text: "Niveau 2 — Chatbot scripté (Tidio, Crisp, ManyChat)",
      },
      {
        type: "p",
        text:
          "Bot conversationnel sur WhatsApp ou Instagram avec arbres de décision figés. Plus interactif que le SMS mais ne s'adapte pas au contexte de la cliente. Bonne marche pour les rappels simples, limité dès qu'il faut répondre à une question hors script.",
      },
      {
        type: "h3",
        text: "Niveau 3 — Agent IA conversationnel (Sofia, alternatives premium)",
      },
      {
        type: "p",
        text:
          "Agent propulsé par un LLM (Claude, GPT-4) qui comprend le langage naturel, consulte votre base de soins, vérifie l'agenda en direct, et répond avec le ton de votre marque. Sofia gère la confirmation, la reprogrammation, la liste d'attente, la relance et l'enrichissement CRM en un seul flux. Bilingue FR/PT/EN. Réduction no-show observée : 60 à 80%.",
      },
      {
        type: "cta",
        href: "/solutions/no-show-killer",
        label: "Découvrir Sofia : agent anti no-show pour cliniques esthétiques →",
      },
      { type: "h2", text: "8. Plan d'action 30 jours" },
      {
        type: "ol",
        items: [
          "Semaine 1 — Mesurer votre taux de no-show actuel sur les 3 derniers mois (sortir le chiffre exact, pas l'impression).",
          "Semaine 1 — Lister vos canaux de prise de rendez-vous (Planity, Treatwell, téléphone, Instagram DM, walk-in).",
          "Semaine 2 — Choisir un outil et le configurer sur 1 type de soin pilote (Hydrafacial par exemple).",
          "Semaine 2 — Préparer les 3 templates WhatsApp (J-3, J-1, H-2) au ton de votre marque.",
          "Semaine 3 — Activer la séquence sur le soin pilote. Suivre le taux de no-show jour par jour.",
          "Semaine 4 — Étendre à tous les soins. Activer liste d'attente + relance 30 min.",
          "Jour 30 — Comparer taux avant/après, calculer le CA récupéré, ajuster les templates qui sous-performent.",
        ],
      },
      {
        type: "p",
        text:
          "Le bénéfice immédiat tombe entre J-15 et J-30. La cliente sent immédiatement la différence de service : rappels personnalisés, reprogrammation fluide, sentiment d'être attendue. Effet collatéral mesuré : +12 à 18 points de NPS dans les 60 jours.",
      },
    ],
  },
  {
    slug: "automatiser-pme-avec-ia",
    title: "Comment automatiser sa PME avec l'IA en 2026 : guide complet",
    description:
      "Méthode pas-à-pas pour automatiser les processus d'une PME française avec l'IA : audit, choix outils n8n / Claude, ROI, sécurité RGPD. Exemples concrets.",
    date: "2026-04-12",
    readingMin: 9,
    cluster: "Automatisation PME",
    body: [
      { type: "p", text: "L'automatisation IA n'est plus réservée aux grandes entreprises. En 2026, une PME peut déployer un workflow IA complet en 4 à 6 semaines, pour un budget maîtrisé et un ROI atteint dès le 3e mois. Ce guide détaille la méthode." },
      { type: "h2", text: "Étape 1 — Identifier les tâches automatisables" },
      { type: "p", text: "Toutes les tâches ne se valent pas. Priorisez celles qui sont répétitives, structurées, avec un fort volume." },
      { type: "ul", items: [
        "Saisie de devis et de commandes",
        "Tri et qualification de leads entrants",
        "Réponses support de niveau 1",
        "Reporting hebdomadaire (ventes, RH, finance)",
        "Onboarding clients ou collaborateurs",
        "Génération de contenu marketing",
      ]},
      { type: "h2", text: "Étape 2 — Choisir la stack" },
      { type: "p", text: "Pour 90% des PME, la stack idéale est n8n (orchestration) + Claude ou GPT-4 (raisonnement) + Airtable ou Notion (données). Cette combinaison couvre la majorité des cas d'usage, sans verrouillage propriétaire." },
      { type: "h2", text: "Étape 3 — Cadrer un POC" },
      { type: "p", text: "Plutôt que de viser une refonte complète, commencez par un Proof of Concept sur un seul process. Délai cible : 2 à 3 semaines. Objectif : prouver le ROI avant d'étendre." },
      { type: "h2", text: "Étape 4 — Sécuriser les données" },
      { type: "p", text: "Hébergement européen (Scaleway, OVH), conformité RGPD, chiffrement bout-en-bout, aucune donnée envoyée pour entraînement. Ces points sont non-négociables pour les PME françaises." },
      { type: "h2", text: "Étape 5 — Mesurer le ROI" },
      { type: "p", text: "Calcul simple : (heures économisées par semaine × coût horaire chargé) × 52 semaines. Comparez au coût total du projet sur 12 mois. La plupart des workflows IA atteignent un ROI supérieur à 300% la première année." },
      { type: "cta", href: "/cas-usage/automatiser-devis-ia", label: "Voir un exemple concret : automatiser ses devis →" },
    ],
  },
  {
    slug: "n8n-vs-make-vs-zapier",
    title: "n8n vs Make vs Zapier : quel outil d'automatisation choisir en 2026 ?",
    description:
      "Comparatif détaillé n8n, Make et Zapier pour l'automatisation d'entreprise : prix, intégrations, courbe d'apprentissage, IA, hébergement. Pour PME et startups françaises.",
    date: "2026-03-20",
    readingMin: 7,
    cluster: "Workflow IA",
    body: [
      { type: "p", text: "Trois outils dominent l'automatisation no-code : n8n, Make et Zapier. Lequel choisir selon votre maturité technique, votre budget et vos contraintes de souveraineté ?" },
      { type: "h2", text: "n8n — Le choix souverain" },
      { type: "p", text: "Open-source, auto-hébergeable (Scaleway, OVH), tarif gratuit en self-host. Idéal pour les entreprises soucieuses de la maîtrise de leurs données. Communauté FR active. Courbe d'apprentissage moyenne mais récompensée par une flexibilité totale." },
      { type: "h2", text: "Make (ex-Integromat) — Le compromis visuel" },
      { type: "p", text: "Interface très visuelle (scénarios graphiques), tarification à l'opération. Excellent pour les profils marketing / ops sans bagage technique. Hébergé en UE." },
      { type: "h2", text: "Zapier — La référence grand public" },
      { type: "p", text: "Le plus connu, plus de 7000 intégrations. Tarification rapidement élevée à l'usage. Hébergement US (point d'attention RGPD pour données sensibles). Idéal pour automatisations légères." },
      { type: "h2", text: "Recommandation Botflow" },
      { type: "ul", items: [
        "Startups tech / dev internes : n8n auto-hébergé",
        "PME marketing / ops : Make",
        "Tests rapides et workflows légers : Zapier",
        "Données sensibles (santé, finance, RH) : n8n on-premise obligatoire",
      ]},
      { type: "cta", href: "/services/automatisation-workflow-ia", label: "Déployer un workflow IA sur-mesure →" },
    ],
  },
  {
    slug: "agent-ia-support-client",
    title: "Agent IA pour le support client : guide d'implémentation 2026",
    description:
      "Comment déployer un agent IA Claude / GPT-4 sur votre support client : architecture RAG, intégrations Zendesk / Intercom, ROI, sécurité. PME et SaaS français.",
    date: "2026-02-15",
    readingMin: 8,
    cluster: "Agent IA",
    body: [
      { type: "p", text: "Un agent IA bien conçu absorbe 60 à 80% des tickets niveau 1 en autonomie. Voici comment l'implémenter sans dégrader la qualité de service." },
      { type: "h2", text: "Architecture RAG : pourquoi c'est essentiel" },
      { type: "p", text: "Plutôt qu'un LLM brut qui invente, un agent RAG (Retrieval Augmented Generation) cherche d'abord dans votre base de connaissance (Notion, Confluence, docs), puis génère sa réponse sourcée. Conséquence : zéro hallucination, traçabilité totale." },
      { type: "h2", text: "Stack recommandée" },
      { type: "ul", items: [
        "Modèle : Claude Sonnet ou GPT-4o (équilibre rapidité / qualité)",
        "Base vectorielle : pgvector ou Pinecone",
        "Frontal chat : widget custom React ou intégration Zendesk / Intercom",
        "Logs et audit : Langfuse ou Phoenix",
      ]},
      { type: "h2", text: "Délai et budget" },
      { type: "p", text: "Comptez 3 à 5 semaines pour un agent avec intégrations CRM / ticketing. Le ROI typique : un poste support junior libéré dès 200 tickets / mois traités." },
      { type: "h2", text: "Pièges à éviter" },
      { type: "ol", items: [
        "Ne pas tester sur des questions réelles avant mise en production",
        "Oublier le fallback humain (toujours prévoir l'escalade)",
        "Sous-estimer le travail de curation de la base de connaissance",
        "Négliger les logs d'interaction (essentiels pour itérer)",
      ]},
      { type: "cta", href: "/services/agent-ia-chatbot", label: "Concevoir mon agent IA →" },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}
