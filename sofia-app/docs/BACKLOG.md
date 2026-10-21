# Backlog de SOFIA

Ce document rassemble tout ce qui reste à faire en dehors du code des phases : ce que toi seul peux faire (comptes, clés, contrats), ce qui est à optimiser dans ce qui existe déjà, et ce qui mériterait d'être ajouté. Il est mis à jour à chaque phase. Le plan des phases elles-mêmes reste dans [`ROADMAP.md`](ROADMAP.md). Dernière mise à jour : fin de la Phase 4 (widget site web), octobre 2026.

## 1. Ce que toi seul peux faire

### Bloquant aujourd'hui : la clé API Anthropic

Sans elle, SOFIA ne peut pas être activée en production (le contrôle « Moteur d'IA configuré » de Réglages → SOFIA reste rouge) et le banc de test ne peut pas mesurer le vrai modèle. Le widget fonctionne déjà, mais seule l'équipe y répond.

Crée la clé dans la console Anthropic (console.anthropic.com), sur un compte avec un moyen de paiement et du crédit, puis fixe une limite de dépense mensuelle dans la même console : c'est le garde-fou budgétaire au-dessus de celui de SOFIA (1 000 réponses par jour et par établissement sur le widget). Une seconde clé pour les prévisualisations permet de suivre le coût des tests à part, mais elle est facultative.

Le plus sûr est que tu ajoutes la clé toi-même, à deux endroits, plutôt que de me l'envoyer dans la conversation, où elle resterait dans l'historique. Dans Vercel, projet `sofia-saas`, Settings → Environment Variables : `ANTHROPIC_API_KEY`, environnement Production. Une variable ajoutée ne s'applique qu'aux nouveaux déploiements : relance le dernier déploiement (Deployments → Redeploy), ou attends la prochaine fusion. Dans GitHub, dépôt `botflow-ia`, Settings → Secrets and variables → Actions : un secret `ANTHROPIC_API_KEY`. Ce secret sert au workflow « SOFIA AI bench », qui lance le banc de test contre le vrai modèle uniquement quand on le déclenche à la main, et garde le rapport complet trente jours. Dis-moi quand c'est fait : je lance le banc, je t'envoie les résultats et le coût mesuré, puis tu peux activer SOFIA sur ton établissement.

### Mettre la démo prospects en ligne

La démo est prête dans le code. Il reste à créer sa base Neon et son projet Vercel, puis à brancher `demo.botflow-ia.fr`, comme l'explique [`DEMO.md`](DEMO.md). Si tu autorises le connecteur Neon dans Claude, je peux créer la base moi-même ; sinon, c'est un quart d'heure de ton côté.

### Ménage des accès

Si ce n'est pas déjà fait, supprime la clé API Brevo, le jeton API Infomaniak et le jeton Vercel créés pendant la mise en ligne : ils ne servent plus. Garde absolument la clé SMTP de Brevo : c'est elle qui envoie les emails de mot de passe, de vérification et d'invitation de la production.

### Avant la première cliente payante

| Action | Pourquoi |
|---|---|
| Passer le projet Vercel au plan Pro | Le plan gratuit (Hobby) est réservé à un usage non commercial. Le plan Pro est aussi nécessaire pour les tâches planifiées à la minute de la Phase 8 (relances, rappels) |
| Faire rédiger ou valider les documents juridiques : conditions générales de SOFIA, politique de confidentialité de BotFlow IA, et contrat de sous-traitance à signer avec chaque établissement | Pour les données de ses clientes, l'établissement est responsable du traitement et BotFlow IA son sous-traitant : l'article 28 du RGPD impose un contrat écrit entre les deux. Ce contrat liste les sous-traitants ultérieurs : Vercel (hébergement), Neon (base de données), Brevo (emails), Anthropic (modèle d'IA), puis Meta et Stripe. Pour Anthropic, vérifie et conserve son accord de traitement des données, qui encadre aussi le transfert des messages hors de l'Union européenne |
| Préparer pour tes clientes un modèle de paragraphe « Assistante virtuelle » à ajouter à leur politique de confidentialité | Le widget renvoie vers la politique de confidentialité de l'établissement (réglage du canal Site web). Un paragraphe prêt à coller évite que chaque institut bloque sur ce point au moment de l'installation |
| Brancher un moniteur de disponibilité sur `https://sofia.botflow-ia.fr/api/health` (UptimeRobot, Better Stack…) | Être prévenu d'une panne avant tes clientes. C'est gratuit et prend cinq minutes |
| Vérifier le plan Neon : durée de restauration des sauvegardes, et mise en veille de la base | Sur le plan gratuit, la base se met en veille après quelques minutes sans activité, et le premier message d'une visiteuse après une période calme attend son réveil. Un plan payant permet de désactiver la veille et allonge la durée pendant laquelle on peut restaurer la base à un instant précis |
| Aligner le site vitrine sur ce que SOFIA fait réellement | Le site annonce des connexions avec Planity, Treatwell, Zolmi, Booksy, Phorest et Doctolib Pro, que SOFIA n'a pas : plusieurs de ces outils n'ont pas d'API ouverte. Une cliente qui signe pour une intégration absente est une cliente perdue et un risque de litige |
| Installer le widget SOFIA sur botflow-ia.fr, avec ta propre fiche d'établissement | La meilleure démonstration commerciale est un prospect qui parle à SOFIA sur ton site et reçoit une vraie réponse. C'est aussi le premier test en conditions réelles, sur ton propre trafic, avant celui d'une cliente |

### Avant les phases suivantes, à lancer tôt à cause des délais

| Phase | Ce qu'il faut préparer | Délai à prévoir |
|---|---|---|
| 5 — WhatsApp | Meta Business Manager vérifié (justificatifs de l'entreprise), app Meta de type Business, numéro dédié jamais utilisé dans l'application WhatsApp, idéalement le statut de Tech Provider pour connecter les numéros de tes clientes | De quelques jours à plusieurs semaines pour la vérification de l'entreprise |
| 6 — Instagram | Compte Instagram professionnel relié à une page Facebook (le tien pour les tests), et la revue d'app Meta pour les permissions de messagerie | La revue Meta se compte en jours, parfois en semaines, et demande une vidéo de démonstration que je préparerai |
| 7 — Rendez-vous | Un projet Google Cloud avec son écran de consentement, à faire vérifier par Google : l'accès aux agendas est un accès « sensible ». Un compte Calendly pour l'adaptateur Calendly | Plusieurs jours à plusieurs semaines pour la vérification Google ; sans elle, l'écran d'autorisation affiche un avertissement et le nombre d'utilisateurs est plafonné |
| 8 — Relances et campagnes | Le sous-domaine d'envoi des campagnes dans Brevo (enregistrements DNS chez Infomaniak), le nom d'expéditeur des SMS et des crédits SMS, et la vérification des règles portugaises de prospection par SMS et email | Quelques jours pour le DNS et l'expéditeur ; la vérification juridique portugaise avant d'ouvrir ce pays |
| 10 — Facturation | Un compte Stripe vérifié, les prix des plans STARTER, GROWTH et PRO, la durée de l'essai gratuit, et un compte de suivi des erreurs (Sentry ou équivalent) | La vérification Stripe est rapide si les justificatifs de l'entreprise sont prêts ; les prix sont une décision commerciale à prendre avant |

## 2. À optimiser dans ce qui existe

Rien de ce tableau ne bloque le lancement. Chaque ligne dit quand l'amélioration devient utile, pour ne pas complexifier SOFIA avant que le volume le justifie.

| Sujet | Aujourd'hui | Amélioration | Quand |
|---|---|---|---|
| Arrivée des réponses dans le widget | La fenêtre interroge SOFIA à intervalles réguliers : toutes les 1,5 seconde quand une réponse est attendue, puis 4, 15 ou 30 secondes selon que le panneau est ouvert, fermé ou l'onglet masqué. Chaque interrogation coûte un appel de fonction Vercel et une lecture en base | Une connexion où le serveur pousse la réponse dès qu'elle est prête (Server-Sent Events, ou un service temps réel comme Ably ou Pusher) | Quand des centaines de visiteuses ont le widget ouvert en même temps, ou que la facture Vercel le montre |
| Calcul des réponses du widget | La réponse de SOFIA est calculée juste après l'envoi du message, dans la même fonction, limitée à 60 secondes. Si cette fonction est interrompue, le message reste sans réponse : la visiteuse peut réécrire après 75 secondes, et la conversation reste visible dans l'inbox | Passer ces réponses par la file de tâches de la Phase 8, avec nouvelles tentatives et alerte à l'équipe si la réponse n'arrive pas | Phase 8, avec le moteur de tâches |
| Limites anti-abus | Comptées dans PostgreSQL : une écriture en base par message reçu | Un stockage en mémoire partagé (Redis, par exemple Upstash) | Si la base devient le goulot d'étranglement |
| Robots sur le widget | Limites par adresse IP, champ piège et contrôle de l'origine des messages | Un contrôle invisible anti-robots (Vercel BotID ou Cloudflare Turnstile) sur le premier message | Dès qu'un abus réel apparaît dans les journaux |
| Coût et qualité du modèle | Claude Opus 5.5 avec un effort moyen, Claude Sonnet 5.5 en secours | Avec la clé, mesurer au banc de test la qualité et le coût par message, essayer un effort plus bas et Sonnet 5.5 comme modèle principal, et vérifier que la Knowledge Base est bien servie depuis le cache (les jetons lus en cache sont enregistrés à chaque réponse) | Dès que la clé est là |
| Budget quotidien du widget | 1 000 réponses de SOFIA par jour et par établissement, identique pour tous | Un budget par plan (STARTER, GROWTH, PRO), réglable par établissement depuis l'espace Super Admin | Phase 10, avec les plans |
| Recherche dans les documents | Recherche par mots, insensible aux accents | Recherche par le sens (pgvector) | Quand un établissement dépasse quelques dizaines de documents |
| Documents de la Knowledge Base | Collés en texte | Import de PDF et de pages web | Quand une cliente le demande |
| Conservation des conversations anonymes | Une visiteuse qui ne laisse pas ses coordonnées garde une fiche anonyme, conservée comme les autres contacts (3 ans par défaut) | Une durée plus courte pour les conversations sans coordonnées, appliquée par la purge automatique, au nom de la minimisation des données du RGPD | Phase 10, avec la purge |
| Accessibilité | Soignée à la conception (libellés des champs et des boutons, contraste calculé), sans contrôle automatique | Un contrôle automatique (axe) dans les tests de bout en bout, pour l'application et le widget | Au fil de l'eau |
| Site vitrine (racine du dépôt) | 26 erreurs de lint relevées à l'audit, et la route `/api/lead` écrit le formulaire complet dans les journaux de Vercel | Corriger le lint, et ne plus écrire de données personnelles en clair dans les journaux (point RGPD) | À planifier, c'est hors de SOFIA |

## 3. À ajouter

Ces idées ne sont pas dans le plan des phases. Elles sont classées par intérêt commercial ; aucune n'est commencée sans ton accord.

| Idée | Intérêt | Point d'attention |
|---|---|---|
| Événements de conversion pour le site de l'établissement : le widget signale « conversation ouverte », « coordonnées laissées » ou « demande de rendez-vous », et le gestionnaire de balises du site les transmet à Google Analytics ou au pixel Meta | Tes clientes voient dans leurs propres outils combien de leads SOFIA leur apporte, et peuvent optimiser leurs publicités dessus. C'est un argument de vente fort | Ces événements passent par le bandeau cookies du site de l'établissement : SOFIA ne dépose rien elle-même |
| Bulle d'invitation après quelques secondes sur les pages choisies (tarifs, prestations) | Davantage de conversations ouvertes, donc de leads | Désactivée par défaut, avec un délai raisonnable : une bulle trop insistante fait fuir |
| Message hors horaires dans le widget (« l'équipe vous répond demain dès 9 h ») quand SOFIA est en pause | La visiteuse sait quand elle aura une réponse, et laisse plus volontiers ses coordonnées | Calculé depuis les horaires et fermetures déjà saisis |
| Entonnoir du widget dans le dashboard : ouvertures, conversations, coordonnées laissées, rendez-vous | Montre à l'institut ce que rapporte son site, comme la carte « CA récupéré » | Il faut compter les ouvertures du widget, qui ne sont pas enregistrées aujourd'hui |
| Copie de la conversation envoyée par email à la visiteuse qui a laissé son adresse | Elle garde les informations données (prix, préparation d'un soin) | Envoi par le sous-domaine des emails de l'application, sans contenu marketing |
| Coût de l'IA par établissement dans l'espace Super Admin | Savoir quelles clientes coûtent combien, et fixer les prix des plans sur des chiffres réels | Calculé à partir des jetons déjà enregistrés à chaque réponse ; prévu en Phase 10, à avancer si les prix doivent être fixés avant |
| Suivi des erreurs (Sentry ou équivalent) avancé avant la première cliente | Aujourd'hui, une erreur en production n'est visible que dans les journaux de Vercel | Prévu en Phase 10 ; je recommande de l'avancer, c'est une demi-journée de travail |
| Envoi de photos dans le widget | Une cliente peut montrer une zone à traiter | À décider avec prudence : une photo de peau peut être une donnée de santé au sens du RGPD, avec des obligations renforcées. SOFIA ne doit jamais l'analyser elle-même |
| OpenAI comme modèle de secours | Disponibilité si Anthropic tombe entièrement | Non recommandé aujourd'hui (voir [`PHASE-3.md`](PHASE-3.md)) : un second prompt à valider et maintenir pour un gain faible |

## Ce que je fais dès que la clé est là

Je lance le workflow « SOFIA AI bench » sur les quinze scénarios, cinq passages chacun, et je t'envoie le tableau de réussite, les réponses qui posent problème et le coût réel par message. Si un scénario échoue, je corrige le prompt ou les garde-fous et je relance. Ensuite seulement, tu actives SOFIA sur ton établissement et tu installes le widget sur ton site, pour une première semaine en conditions réelles avant ta première cliente.
