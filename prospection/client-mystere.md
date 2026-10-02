# Mécanique « Client mystère » — preuve de perte de RDV

> Principe : on contacte le prospect **comme un vrai client** sur son Instagram
> pour demander un rendez-vous. S'il ne répond pas, on tient la preuve concrète
> qu'il perd des demandes — et on la lui montre (capture d'écran) pour déclencher
> l'audit. Objectif : transformer un simple cold email en démonstration vivante.

## Cible & garde-fous

- Uniquement les prospects **déjà contactés** par email, qui ont un **Instagram**
  (champ `Contact_Alternatif` contenant « IG: »), et qui sont **dans la cible
  esthétique** (Niche « Cliniques esthétiques » / instituts / spas).
- **Exclure** : Opt_Out=true, Statut « Refus », dentaire, cabinets médicaux
  généraux, « Hors cible ». Un prospect qui a dit STOP ne reçoit RIEN, sur aucun
  canal (RGPD + délivrabilité).
- Le DM se fait depuis un compte Instagram **neutre** (pas @botflow, sinon la
  couverture tombe). C'est un test d'accueil, pas une usurpation : on reste factuel
  et on assume la démarche au moment de la preuve.

## Champs Airtable de suivi (déjà créés)

- `DM_Mystere_Statut` (fldBw7qP8KMkcS0Qw) : `DM envoyé` → `Répondu` /
  `Sans réponse (preuve)` → `Preuve envoyée`.
- `DM_Mystere_Date` (fldMkMMh5zO27oyNS) : date d'envoi du DM mystère.

## Les 4 étapes

1. **Sélection** : chaque jour, la liste des instituts à tester (contactés, avec
   IG, dans la cible, `DM_Mystere_Statut` vide) — c'est la « liste DM mystère »
   déjà produite par la routine d'envoi, recoupée avec les garde-fous ci-dessus.
2. **Envoi du DM mystère** (manuel, depuis le compte neutre) : tu envoies le
   message client ci-dessous, puis tu poses dans Airtable `DM_Mystere_Statut` =
   « DM envoyé » et `DM_Mystere_Date` = aujourd'hui.
3. **Observation (48 h / 2 jours ouvrés)** : s'ils répondent sur Instagram, tu
   mets `DM_Mystere_Statut` = « Répondu » (ils sont réactifs, on ne les utilise pas
   comme preuve). S'ils ne répondent pas sous 2 jours ouvrés, la routine de suivi
   les bascule en « Sans réponse (preuve) ».
4. **Preuve** (manuel, avec la capture) : pour chaque « Sans réponse (preuve) », tu
   fais une capture de la conversation restée sans réponse, tu l'attaches, et tu
   envoies le mail de preuve ci-dessous. Puis `DM_Mystere_Statut` = « Preuve envoyée ».

> L'envoi du DM et l'envoi de la preuve restent **manuels** : la capture d'écran
> ne peut pas être générée automatiquement, et un contrôle humain évite d'envoyer
> « vous n'avez pas répondu » à quelqu'un qui a répondu. La routine ne fait que
> sélectionner, suivre les délais et préparer.

## Message client mystère (à envoyer sur Instagram)

Court, naturel, une demande de RDV concrète. Varie le soin et le jour selon
l'institut pour que ça reste crédible.

**PT**
- « Bom dia 🙂 Queria saber se têm disponibilidade na quarta de manhã para um tratamento facial? Obrigada »
- « Olá! Gostava de marcar uma limpeza de pele esta semana, ainda têm vaga? »

**FR**
- « Bonjour 🙂 Est-ce que vous auriez de la disponibilité mercredi matin pour un soin du visage ? Merci ! »
- « Bonjour, je souhaiterais prendre rendez-vous cette semaine pour un soin, avez-vous encore de la place ? »

## Mail de preuve (envoyé par email, capture en pièce jointe)

Angle : transparent, factuel, sans reproche, puis retour au bénéfice + audit.
Personnalise {Entreprise}, {date du DM}, {X jours}.

**FR — Objet : « J'ai testé votre accueil client (voici le résultat) »**

Bonjour,

Je vais être transparent avec vous : la semaine dernière, le {date du DM}, je vous ai écrit sur votre Instagram en me faisant passer pour un client, pour demander un rendez-vous.

À ce jour, {X} jours plus tard, toujours pas de réponse. La capture est en pièce jointe.

Ce n'est pas un reproche : vous êtes concentrés sur les clients présents, c'est normal. Mais ce message était un vrai rendez-vous potentiel, et comme lui il y en a d'autres chaque semaine, le soir et le week-end, qui finissent chez un concurrent qui a répondu plus vite.

C'est exactement ce qu'on corrige : un système automatisé sur mesure, à votre enseigne, qui répond à chaque demande en moins d'une minute, 24h/24, sur Instagram, WhatsApp et votre site.

Si vous voulez voir ce que ça représente pour {Entreprise}, je vous envoie un lien d'audit qui chiffre vos pertes. Dites-moi simplement oui.

Bien à vous,
Yassine — Botflow.IA

Pour ne plus recevoir de messages, répondez « STOP ».

**PT — Assunto : « Testei o vosso atendimento (aqui está o resultado) »**

Bom dia,

Vou ser transparente consigo: na semana passada, no dia {date do DM}, escrevi-lhe no vosso Instagram como se fosse um cliente, a pedir uma marcação.

Até hoje, {X} dias depois, ainda sem resposta. Junto a captura de ecrã.

Não é uma crítica: estão concentrados nos clientes que já têm, é normal. Mas aquela mensagem era uma marcação real, e como ela há outras todas as semanas, à noite e ao fim de semana, que acabam num concorrente que respondeu mais depressa.

É exatamente isto que resolvemos: um sistema automatizado à medida, com a vossa marca, que responde a cada pedido em menos de um minuto, 24h/dia, no Instagram, WhatsApp e site.

Se quiser ver o que isto representa para a {Entreprise}, envio-lhe um link de auditoria que calcula as vossas perdas. Basta dizer que sim.

Com os melhores cumprimentos,
Yassine — Botflow.IA

Para não voltar a receber mensagens, responda «STOP».

## Routine 5 — Client mystère : suivi & preuve (`0 10 * * 1-5`, 12h Paris)

Ne fait AUCUN envoi. Sélectionne, suit les délais, prépare. Prompt à coller dans
une nouvelle routine (connecteurs Airtable + Gmail).

```
Routine BotFlow — client mystère : suivi & préparation des preuves. Tu n'envoies AUCUN email ni DM. Tu sélectionnes, tu suis les délais et tu prépares un brief.

PÉRIMÈTRE STRICT : uniquement via les connecteurs Airtable (et Gmail en lecture si besoin). Ne touche jamais au dépôt de code (aucun fichier, branche git, commit, pull request).

Vérifie l'accès à mcp__Airtable__*. Si absent, ne fais rien et signale-le.
Airtable : base app7l6qJCDoWebj8s, table PROSPECTS_B2B (tblEc8k4ch3KQyosV). Champs : Entreprise fldgMy6uNB1VzY8p1, Statut_Outreach fldD933RiNGtt0ow2, Opt_Out fld4K0vNOtk4cC4J1, Niche fldLaYjjz8emj6u85, Contact_Alternatif fldNLD3B6VHsXxCMQ, Notes fldxMHf7VaEaeeFer, DM_Mystere_Statut fldBw7qP8KMkcS0Qw, DM_Mystere_Date fldMkMMh5zO27oyNS.

A. À TESTER AUJOURD'HUI : liste les prospects avec Contact_Alternatif contenant « IG: », Statut « Touche 1 envoyée »/« Touche 2 »/« Touche 3 », DM_Mystere_Statut vide, ET dans la cible (Niche « Cliniques esthétiques »). EXCLURE Opt_Out=true, Statut « Refus »/« Hors cible », dentaire, cabinet médical général. Donne « Établissement → Instagram » (max 10/jour, priorité aux plus récents). Ne change rien : c'est l'opérateur qui envoie le DM et met DM_Mystere_Statut = « DM envoyé » + DM_Mystere_Date = aujourd'hui.

B. PREUVES PRÊTES : pour chaque prospect DM_Mystere_Statut = « DM envoyé » dont DM_Mystere_Date est ≥ 2 jours ouvrés dans le passé, bascule DM_Mystere_Statut = « Sans réponse (preuve) ». Puis liste-les (Établissement, Instagram, DM_Mystere_Date) avec la mention : capture à faire + envoyer le mail de preuve (modèle « Mail de preuve » de client-mystere.md), puis passer en « Preuve envoyée ». NE bascule PAS un prospect déjà marqué « Répondu ».

C. EN ATTENTE : compte les « DM envoyé » de moins de 2 jours (observation en cours).

Termine par le brief en 3 blocs (À tester / Preuves prêtes / En attente). Aucun envoi.
```

## Automatisation via PlugKit — ce qui est possible (et ce qui ne l'est pas)

- **Envoi du DM mystère : NON automatisable.** L'API Instagram officielle (celle
  qu'utilise PlugKit) n'autorise à ouvrir un fil qu'avec quelqu'un qui vous a
  écrit en premier (fenêtre 24 h). Un premier DM à froid vers un prospect qui ne
  vous a jamais écrit est bloqué par Meta ; les outils qui « forcent » l'envoi
  sont hors CGU et font bannir le compte. → Le DM reste **manuel**, depuis un
  compte séparé.
- **Détection des réponses : automatisable.** PlugKit lit l'inbox du compte
  expéditeur (vérifié). Si les DM partent d'un compte **connecté à PlugKit**, une
  routine peut, pour chaque prospect « DM envoyé », retrouver le fil par son handle
  Instagram et poser tout seul `DM_Mystere_Statut` = « Répondu » (message entrant
  après `DM_Mystere_Date`) ou « Sans réponse (preuve) » (rien après 2 jours
  ouvrés). Compte actuellement connecté : `@yass.automat`
  (accountId `cmulrqsf344jjqx01tkisckrb`). PlugKit : `list_conversations` /
  `list_messages` sur cet accountId.
- **Prérequis** : (1) envoyer depuis un compte connecté à PlugKit — idéalement un
  compte « client » dédié, pas `@botflow` ni un compte pro reconnaissable ; (2) que
  le connecteur PlugKit soit disponible pour les routines (comme Gmail/Airtable).
  Sinon, la détection reste manuelle (tu coches « Répondu » toi-même dans Airtable).
- **Capture + mail de preuve : restent manuels** — la capture ne se génère pas
  toute seule, et un contrôle humain évite d'écrire « vous n'avez pas répondu » à
  quelqu'un qui a répondu.
