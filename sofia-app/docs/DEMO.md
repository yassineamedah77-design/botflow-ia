# La démo prospects

La démo est un lien à envoyer à un prospect, par exemple `https://demo.botflow-ia.fr`. Il clique sur « Lancer ma démo » et reçoit en quelques secondes sa propre copie de Maison Éclat, un institut fictif, sans inscription. Il commence sur le site web de l'institut, où SOFIA est installée : il lui écrit comme une cliente. Il ouvre ensuite le tableau de bord, connecté comme la gérante, et retrouve sa conversation dans l'inbox, la fiche créée dans le CRM, ainsi que trois mois d'activité : chiffre d'affaires récupéré, conversations WhatsApp et Instagram, anciennes clientes à réactiver, base de connaissances. Il peut prendre la main et répondre lui-même depuis l'inbox, et voir sa réponse arriver dans le widget.

## Les cliniques préparées pour un appel

Pour un rendez-vous avec une clinique précise, la démo a une page réservée à toi : `https://demo.botflow-ia.fr/demo/cliniques`, protégée par la clé `DEMO_ADMIN_KEY`. Avant l'appel, tu y crées la clinique du prospect en cinq minutes à partir de son site : nom, ville, adresse, téléphone, horaires de la semaine et du samedi, et de un à six soins. Tu ne mets que les prix affichés sur son site ; un soin sans prix est présenté « preço indicado em consulta », et SOFIA n'en invente jamais. SOFIA répond dans une seule langue, portugais du Portugal ou français, celle que tu choisis.

La clinique a aussitôt sa page publique, par exemple `https://demo.botflow-ia.fr/d/clinica-sorriso` : son nom, ses soins et ses prix, ses horaires, et SOFIA en bas à droite. Pendant l'appel, tu envoies ce lien à la gérante, elle écrit à SOFIA depuis son téléphone, puis tu cliques sur « Tableau de bord » pour lui montrer la conversation arrivée dans l'inbox. Pour une vidéo d'audit, filme cette même page en posant la question du message client mystère.

Clínica Lumina est la clinique fictive permanente, à Braga, avec la limpeza de pele à 60 €. Le bouton « Remettre Clínica Lumina à zéro » la recrée vide, à la même adresse `/d/clinica-lumina`. Les cliniques préparées ne sont pas effacées au bout de 24 heures : tu les supprimes toi-même après l'appel.

Deux limites, voulues. SOFIA ne propose pas de créneau précis, car elle n'a pas encore d'agenda (Phase 7) : elle note la demande avec le jour et le moment souhaités, et l'équipe confirme. Et le temps de réponse sera mesuré dès que la clé Anthropic sera en place ; s'il dépasse 20 secondes, `SOFIA_AI_EFFORT=low` sur le projet de démo le réduit.

## Ce qui protège la démo

Chaque prospect a sa copie : personne ne voit ce qu'un autre a écrit, et ce qu'il modifie ne gêne personne. Chaque copie est effacée au bout de 24 heures, comptes compris. La démo vit dans son propre déploiement et sa propre base de données, jamais dans celle de tes clientes, et l'application refuse de démarrer si le mode démo est activé en production, si l'inscription y est ouverte ou si elle peut envoyer de vrais emails. Les appels payants au modèle d'IA sont plafonnés de trois façons, en plus de la limite de dépense que tu fixes chez Anthropic :

| Limite | Valeur |
|---|---|
| Copies créées par connexion (adresse IP) | 3 par jour |
| Copies créées au total | 200 par jour |
| Réponses de SOFIA et tests dans la console, toutes copies confondues | 3 000 par jour |

Au-delà de la dernière limite, SOFIA se tait dans la démo et c'est « l'équipe » qui répond, comme dans le vrai produit quand le budget quotidien est atteint.

## Mettre la démo en ligne

Il faut un second projet Vercel et une seconde base Neon, en suivant [`VERCEL.md`](VERCEL.md) avec ces différences.

**La base.** Dans Neon, crée une base `sofia_demo` et un rôle `sofia_demo_app`, avec les trois mêmes lignes SQL que pour la production (rôle sans privilège, puis base qui lui appartient). Une branche de la base de production ne convient pas : elle en copierait les données.

**Le projet Vercel.** Importe le même dépôt dans un nouveau projet, par exemple `sofia-demo`, avec `sofia-app` comme Root Directory, Node.js 22, et la branche `main` comme branche de production. Le build migre la base de démo comme celle de production.

| Variable | Valeur |
|---|---|
| `APP_ENV` | `staging` |
| `DEMO_MODE` | `true` |
| `SIGNUP_ENABLED` | `false` |
| `EMAIL_TRANSPORT` | `console` : aucun email ne part de la démo |
| `APP_URL` | `https://demo.botflow-ia.fr` |
| `DATABASE_URL`, `DATABASE_MIGRATION_URL` | Les adresses poolée et directe de `sofia_demo_app` sur `sofia_demo` |
| `DATABASE_POOL_MAX` | `5` |
| `ENCRYPTION_KEY` | Une nouvelle clé (`openssl rand -base64 32`), différente de celle de la production |
| `ANTHROPIC_API_KEY` | Idéalement une clé dédiée à la démo, pour suivre son coût à part |
| `DEMO_ADMIN_KEY` | La clé de ta page des cliniques, longue et aléatoire (`openssl rand -base64 32`) ; sans elle, la page n'existe pas |

**Le domaine.** Ajoute `demo.botflow-ia.fr` au projet, puis le `CNAME` indiqué par Vercel chez Infomaniak, comme pour `sofia.botflow-ia.fr`.

Sans clé Anthropic, la démo fonctionne mais SOFIA ne répond pas : le prospect écrit, la conversation arrive dans l'inbox et il peut seulement y répondre lui-même. La clé est donc ce qui rend la démo convaincante.

## Comment la présenter

Le plus efficace est de la faire en direct, en partage d'écran, pendant un appel de découverte : tu écris toi-même à SOFIA une question que le prospect reçoit tous les jours (« combien coûte… », « vous avez de la place samedi ? »), puis tu bascules sur le tableau de bord pour montrer que la conversation, la fiche et l'alerte sont déjà là. Envoyé seul, le lien marche aussi : la page d'accueil de la démo guide le prospect en trois étapes, et le site de l'institut lui propose des questions à poser.
