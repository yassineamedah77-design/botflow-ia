# Funnel de candidature BotFlow.IA Academy — design

**Date** : 2026-09-02
**Branche** : `feat/academy-qualification-funnel`
**Statut** : design validé sur 8 décisions, 3 réglages tranchés par défaut (voir §9)

## 1. Problème

Yassine reçoit un flux croissant de DM Instagram de gens qui veulent « faire comme lui » :
vivre au Portugal grâce à un métier 100 % remote. Exemple déclencheur : Chloé
(`chlooe_91`, 579 abonnés, 2026-09-01) — « j'ai pas compris ton métier », « est-ce que ça
suffit pour habiter au Portugal ? », « c'est mon projet aussi ».

Trois problèmes se cumulent :

1. **Aucun process de réponse.** Chaque DM est traité à la main, sans qualification, sans trace.
2. **Aucune capture de données.** Les conversations meurent dans Instagram. Impossible de
   savoir qui est chaud, qui est tiède, ni de recontacter dans 6 mois.
3. **Aucun lien en bio** (@yass.automat, 76 abonnés) — goulot d'étranglement identifié depuis
   des semaines. Le trafic organique (réel expat du 29/08 : 6 300 vues) n'a nulle part où aller.

Le volume est faible aujourd'hui (76 abonnés). L'enjeu n'est donc pas le débit, c'est de
**ne perdre aucune donnée** pendant la phase de montée en audience, pour pouvoir retargeter
une base qualifiée quand elle sera assez grosse.

## 2. Objectif

Un lien unique, envoyable en DM et posable en bio, qui :

- **qualifie** en 2 minutes qui peut acheter maintenant un accompagnement 1-1 à 2 500 € ;
- **collecte** le maximum de contexte exploitable (motivation en mots propres, blocages,
  délai, budget, niveau) pour closer en appel ;
- **segmente** automatiquement chaud / tiède / froid ;
- **stocke** tout dans le CRM Airtable existant pour un retargeting futur.

Non-objectifs (hors périmètre de cette spec) :

- paiement en ligne — le close se fait en appel ;
- séquence email automatisée — phase ultérieure, quand la base sera assez grosse ;
- ressource gratuite / lead magnet — phase ultérieure.

## 3. Décisions actées

| Sujet | Décision |
|---|---|
| Offre vendue en 1-1 | **2 500 €** (hausse depuis 1 490 €) |
| Prix sur la page academy | **Retiré.** Le bloc Coaching devient « 1:1 — sur candidature, places limitées » + CTA vers le questionnaire. L'offre Autonome 490 € reste en self-serve. |
| Angle éditorial | **Le métier d'abord, la liberté comme conséquence.** On vend une compétence, pas un rêve d'expat — tout en accrochant sur la motivation réelle (partir). |
| Filtre budget | **Indirect, sans chiffre.** « Si le plan te convient, t'es prêt(e) à investir pour aller plus vite ? » |
| Hébergement | Page standalone dans `agentic-academy/` + fonction serverless dans le **même projet Vercel** (`botflow-academy`, `prj_6M5R1hAeXp0mTqN0nvEvEx78Gdvv`) |
| Stockage | Nouvelle table `LEADS_ACADEMY` dans la base Airtable **CRM yass_IA** (`app7l6qJCDoWebj8s`) |
| Sortie de funnel | Calendly **uniquement si qualifié**, liste d'attente sinon |
| URL | `academy.botflow-ia.fr/candidature` (`/start` redirige) |

## 4. Architecture

```
IG bio ────────────┐
DM (séquence 3 msg)┼──→ /candidature?src={dm|bio|story}
Story / réel CTA ──┘              │
                                  ▼
                   11 écrans, une question par écran
                                  │
                                  ▼
                    POST /api/lead  (fonction Vercel)
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              scoring serveur  Airtable    notif email
                                LEADS_ACADEMY  (si segment A)
                                  │
                                  ▼
                     écran de fin conditionnel
              A ≥55 → Calendly inline
              B 35-54 → « je te reviens sous 48h »
              C <35 → liste d'attente
```

Le scoring tourne **côté serveur** : le client n'envoie que les réponses brutes. Rien
d'exploitable depuis le navigateur, et la règle de scoring peut évoluer sans redéployer la page.

## 5. Le questionnaire — 11 écrans

Une question par écran, barre de progression, retour arrière possible, aucune question
obligatoire sauf prénom / email / consentement. Chaque question fait un des trois jobs :
**qualifier**, **armer le closing**, ou **servir le retarget**.

| # | Champ | Question | Type | Job |
|---|---|---|---|---|
| 1 | `prenom` | Comment tu t'appelles ? | texte | identité |
| 2 | `instagram` | Ton @ Instagram | texte | rapprochement avec le DM |
| 3 | `situation` | Tu fais quoi en ce moment ? | salarié · freelance · entrepreneur · étudiant · sans emploi | qualif |
| 4 | `motivation` | En 2 phrases : pourquoi tu veux ce changement ? | textarea | **munition de closing n°1** |
| 5 | `niveau_tech` | Ton niveau aujourd'hui | zéro · j'ai testé ChatGPT · Make/Zapier/n8n · je code | personnalisation |
| 6 | `blocages` | Qu'est-ce qui te bloque ? | multi : par où commencer · le temps · trouver des clients · la tech · je stagne · l'argent | munition n°2 |
| 7 | `temps_dispo` | Combien d'heures par semaine tu peux y mettre ? | <5h · 5-10h · 10-20h · +20h | qualif sérieux |
| 8 | `objectif_revenu` | Ton objectif de revenu mensuel | **chiffre libre en € / mois** | calibrage de la promesse |
| 9 | `deja_formation` | T'as déjà investi dans une formation en ligne ? | oui · non | **meilleur prédicteur d'achat** |
| 10 | `pret_a_investir` | Si le plan te convient, t'es prêt(e) à investir pour aller plus vite ? | oui · oui mais dans quelques mois · non | **filtre budget** |
| 11 | `email`, `telephone`, `rgpd` | Où je t'envoie ta réponse ? | email (requis) · WhatsApp (optionnel) · consentement (requis) | contact + retarget |

Retirées le 2026-09-02 sur décision du user : le pays actuel, la destination visée et le
délai. L'urgence que portait le délai est reprise par « oui mais dans quelques mois » sur la
question d'investissement, et l'objectif de revenu est passé d'une liste de fourchettes à un
chiffre libre — plus précis pour calibrer le discours en appel.

Le niveau technique zéro n'est **jamais** éliminatoire : c'est l'histoire du fondateur
(ex-supply chain, jamais touché un PC). Les vrais filtres sont délai, budget et heures dispo.

### Règles de copy

- Tutoiement, phrases courtes, ton parlé — la voix des DM, pas la voix corporate.
- Aucune promesse de revenu chiffrée (interdit : L121-2 FR, DL 57/2008 PT, directive UE 2005/29).
- Aucun faux témoignage, aucun compteur inventé.
- Le prix de 2 500 € n'apparaît **nulle part** sur la page.

## 6. Scoring — /100

| Signal | Barème |
|---|---|
| `pret_a_investir` | oui **37** · plus tard **13** · non **0** |
| `temps_dispo` | +20h **19** · 10-20h **15** · 5-10h **8** · <5h **3** |
| `situation` | freelance **15** · salarié **13** · entrepreneur **12** · sans emploi **7** · étudiant **5** |
| `deja_formation` | oui **13** · non **0** |
| `niveau_tech` | no-code ou code **11** · testé ChatGPT **8** · zéro **5** |
| `motivation` > 100 caractères | **5** |

`objectif_revenu` ne rapporte aucun point : c'est une donnée d'appel, pas un filtre.

Maximum : 100.

### Seuils

| Segment | Score | Écran de fin | Action |
|---|---|---|---|
| **A** | ≥ 55 | Calendly inline, « on se cale un appel » | notif email immédiate à Yassine |
| **B** | 35-54 | « Je regarde ton profil et je te reviens sous 48h » | rappel manuel depuis la vue Airtable |
| **C** | < 35 | Liste d'attente, « je te préviens quand j'ouvre des places » | aucun appel, nurture ultérieur |

Seuils volontairement bas au démarrage (volume faible). À remonter vers 65 / 45 quand le
flux dépassera ~10 candidatures par semaine.

## 7. Airtable — table `LEADS_ACADEMY`

Base **CRM yass_IA** = `app7l6qJCDoWebj8s`. Table créée le 2026-09-02 : **`tblXxZiRlfA9E3gZU`**. Quatre champs devenus obsolètes y sont
préfixés `zz_` (Pays, Destination, Delai, l'ancien Objectif_Revenu en liste) : l'API n'autorise
pas leur suppression, à faire à la main. Table distincte de `PROSPECTS_B2B` (outbound B2B
cliniques) : audience, cycle et champs n'ont rien en commun.

| Champ | Type |
|---|---|
| `Prenom` | single line |
| `Instagram` | single line |
| `Email` | email |
| `Telephone` | phone |
| `Situation` | single select |
| `Motivation` | long text |
| `Niveau_Tech` | single select |
| `Blocages` | multiple select |
| `Temps_Dispo` | single select |
| `Objectif_Revenu` | currency € (précision 0) |
| `Deja_Formation` | checkbox |
| `Pret_A_Investir` | single select |
| `Score` | number (précision 0) |
| `Segment` | single select A / B / C |
| `Source` | single select DM · Bio · Story · Direct |
| `Date_Soumission` | date |
| `Statut` | single select Nouveau · Appel calé · Appel fait · Client · Perdu · Nurture |
| `Consentement_RGPD` | checkbox |
| `Notes` | long text |

Vues à créer à la main (l'API Airtable ne crée pas de vue filtrée) : **🔥 Chauds à closer**
(Segment A + Statut Nouveau, tri par Score décroissant) · **🕓 À retargeter** (Segment B ou C) ·
**📅 Appels calés** (Statut = Appel calé) · **📊 Tout**.

Les valeurs écrites sont des libellés français (« Salarié », « < 3 mois ») et non les clés
techniques du barème : la table est lue à la main pour décider qui appeler.

Cohérent avec le protocole de tracking de sources déjà en place sur `PROSPECTS_B2B`.

## 8. Implémentation

| Fichier | Rôle |
|---|---|
| `agentic-academy/candidature.html` | questionnaire, DA BotFlow (dark `#07090a`, vert `#7fe3a1`, Geist + Instrument Serif italic), vanilla, zéro build |
| `agentic-academy/api/lead.js` | fonction serverless : validation, honeypot, scoring, écriture Airtable, notification |
| `agentic-academy/vercel.json` | routes `/candidature` et `/start` |
| `agentic-academy/index.html` | bloc Coaching : `1 490 €` → « sur candidature » + CTA vers `/candidature` |

### Variables d'environnement (projet Vercel `botflow-academy`)

| Variable | Valeur |
|---|---|
| `AIRTABLE_TOKEN` | PAT Airtable, scope `data.records:write` sur la base |
| `AIRTABLE_BASE` | `app7l6qJCDoWebj8s` |
| `AIRTABLE_TABLE` | `tblXxZiRlfA9E3gZU` |
| `NOTIFY_EMAIL` | boîte de réception des alertes segment A |

### Sécurité et conformité

- Honeypot `company_website` — même pattern que `src/app/api/lead/route.ts`.
- Rate limiting simple par IP en mémoire (best effort sur du serverless).
- Aucun secret côté client ; la page ne parle qu'à sa propre fonction, même origine.
- Consentement RGPD explicite, case non pré-cochée, mention de la finalité (recontact +
  informations sur les formations) et lien vers les mentions légales existantes.
- Réponses tronquées côté serveur avant écriture (motivation 3 000 caractères, champs
  courts 200).

### Dégradation

Si l'écriture Airtable échoue, la fonction log le lead complet (visible dans les logs Vercel)
et renvoie quand même `ok` au client avec l'écran de fin approprié : on ne perd jamais un lead
à cause d'une panne d'API, et le candidat ne voit jamais une erreur.

## 9. Réglages tranchés par défaut

Ces trois points ont été décidés faute de retour, et sont les premiers à ajuster :

1. **Question 11 ajoutée** (« déjà investi dans une formation ») — meilleur prédicteur d'achat
   connu sur ce type d'offre.
2. **Seuils 55 / 35** au lieu de 65 / 40 — le volume actuel ne permet pas de rater un profil.
3. **`/candidature`** plutôt que `/start` — le mot fait le tri à lui seul.

## 10. Phasage

| Phase | Contenu |
|---|---|
| **1 — maintenant** | playbook DM, table Airtable, page `/candidature`, fonction serverless, écrans de fin conditionnels |
| **2 — dans la foulée** | page academy : Coaching en « sur candidature », lien posé en bio Instagram |
| **3 — plus tard** | séquence email de retarget, lead magnet gratuit pour le segment C, relances automatiques n8n |
