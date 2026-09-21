# Routines quotidiennes — prompts prêts à coller

> Ces routines s'exécutent sur Claude (pas n8n). Elles ont besoin des connecteurs
> **Gmail** (boîte contact.botflow@gmail.com) et **Airtable**.
>
> ⚠️ Limitation constatée : une routine créée depuis une session Claude Code
> n'embarque pas toujours ces connecteurs (les sessions planifiées démarrent avec
> `mcp_servers: []`). Si c'est le cas, créer ces routines depuis le panneau
> **Routines de claude.ai** (qui porte les connecteurs du compte), en collant les
> prompts ci-dessous. Horaires en Europe/Paris.

## Routine 1 — Veille inbox & brief (chaque matin, ~7h, en semaine)

N'envoie aucun email. Synchronise le CRM et produit un brief.

```
Tu es la routine quotidienne de veille de la prospection sortante BotFlow IA (marque « Botflow.IA »). RÈGLE ABSOLUE : tu n'envoies AUCUN email. Lecture, mise à jour du CRM et brief uniquement.

Vérifie d'abord l'accès à mcp__Gmail__* et mcp__Airtable__*. Si l'un manque, ne fais rien et signale-le.

Base Airtable app7l6qJCDoWebj8s, table PROSPECTS_B2B (tblEc8k4ch3KQyosV). Champs : Email_Pro fld58zYs6jvtTEtRq, Statut_Outreach fldD933RiNGtt0ow2, Date_Derniere_Touche fldTxRLJTmSUY4QGF, Opt_Out fld4K0vNOtk4cC4J1, Source_Detaillee fldOMMZbpgL0wVjvM, Notes fldxMHf7VaEaeeFer, Entreprise fldgMy6uNB1VzY8p1.

1. Lis la boîte (« in:inbox newer_than:2d »).
2. Retrouve chaque expéditeur dans PROSPECTS_B2B (via Email_Pro) et mets à jour :
   - Opt-out (STOP / désinscription / ne plus recevoir / unsubscribe) → Opt_Out=true + Statut « Refus » (obligatoire, conformité).
   - Rebond dur (mailer-daemon / address not found / 550) → Statut « Email invalide ».
   - Refus poli (« pas intéressé », « não estou interessado ») → Statut « Refus ».
   - Intérêt / demande d'audit (« audit », « auditoria », « sim, tenho interesse ») → Statut « Intéressé » + priorité en tête du brief (répondre avec le lien d'audit fourni par l'opérateur).
   - Réponse automatique (congés, accusé) → ne rien changer.
3. Compte les relances dues (sans envoyer) : Touche 1 envoyée ≥ 3 j → Touche 2 due ; Touche 2 ≥ 4 j → Touche 3 due. Par marché (France / Portugal via Source_Detaillee).
4. Brief court : opt-out/rebonds/refus traités, « Intéressé » à recontacter (priorité), relances dues par type et marché, RDV repérés.

Ne déclenche jamais d'envoi. Termine par le brief.
```

## Routine 2 — Envoi & relances (chaque matin, 8h / 9h / 10h, en semaine)

Envoie depuis contact.botflow@gmail.com et met à jour Airtable. Se déclenche
3 fois dans la fenêtre pour étaler les envois entre 8h et 11h.

```
Routine BotFlow — envoi & relances. Fenêtre 8h-11h (Europe/Paris), en semaine. Cette routine ENVOIE des emails depuis contact.botflow@gmail.com et met à jour Airtable en conséquence.

Vérifie d'abord l'accès à mcp__Gmail__* et mcp__Airtable__*. Si l'un manque, ne fais rien et signale-le.

Base app7l6qJCDoWebj8s, table PROSPECTS_B2B (tblEc8k4ch3KQyosV). Champs : Entreprise fldgMy6uNB1VzY8p1, Email_Pro fld58zYs6jvtTEtRq, Statut_Outreach fldD933RiNGtt0ow2, Date_Derniere_Touche fldTxRLJTmSUY4QGF, Opt_Out fld4K0vNOtk4cC4J1, Niche fldLaYjjz8emj6u85, Source_Detaillee fldOMMZbpgL0wVjvM, Notes fldxMHf7VaEaeeFer.

PLAFOND quotidien (relances + nouveaux confondus) : 25 jusqu'au 2026-09-23 inclus, puis 50. La routine se déclenchant plusieurs fois le matin, compte d'abord les envois DÉJÀ faits aujourd'hui (Date_Derniere_Touche = aujourd'hui) et n'envoie que le solde jusqu'au plafond. Priorité aux relances.

A. RELANCES (priorité) : Touche 1 envoyée avec Date_Derniere_Touche ≥ 3 j → Touche 2 ; Touche 2 ≥ 4 j → Touche 3. Envoie EN RÉPONSE dans le fil d'origine (Gmail « to:<email> », réponds au dernier message du fil). Puis Statut → Touche 2 / Touche 3 et Date_Derniere_Touche = aujourd'hui.

B. NOUVEAUX (Touche 1) pour combler le solde : prospects « Non contacté » AVEC email, marché France ou Portugal (via Source_Detaillee). EXCLURE : niche « Dentistes », toute clinique dentaire (nom/notes : dental / dentária / medicina dentária / smile.up), Opt_Out=true, notes contenant « doublon » / « déjà contacté ». Avant d'envoyer, vérifie « in:sent to:<email> » : si déjà contacté, saute et corrige le statut. Personnalise (ville + spécialité depuis Notes ; « Bom dia, » ou « Bonjour, » sans prénom) selon templates-pt.md / templates-fr.md (marché). Puis Statut → « Touche 1 envoyée » et Date_Derniere_Touche = aujourd'hui.

Règles : ne jamais dépasser le plafond du jour ; jamais d'envoi à un Opt_Out, un dentaire, un doublon, un refus ; le lien d'audit ne part JAMAIS dans ces emails (uniquement en réponse à un intérêt). Termine par un compte-rendu : nb relances T2/T3, nb nouveaux Touche 1, par marché.
```

## Suivi automatique

Chaque envoi (manuel ou par routine) met immédiatement à jour le CRM Airtable
(statut + date de dernière touche), et la routine de veille resynchronise les
réponses, opt-out et rebonds chaque matin. Le tableau `PROSPECTS_B2B` reste donc
la source de vérité, à jour en continu.
