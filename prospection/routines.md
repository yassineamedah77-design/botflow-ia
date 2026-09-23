# Routines quotidiennes — prompts prêts à coller

> Ces routines s'exécutent sur Claude (pas n8n), depuis le panneau **Routines de
> claude.ai** (qui porte les connecteurs Gmail + Airtable + Apify du compte).
> Horaires exprimés en **UTC** dans les crons ; l'équivalent Europe/Paris (CEST,
> UTC+2) est indiqué à côté.
>
> ⚠️ Une routine créée depuis l'interface claude.ai ne peut être modifiée QUE
> depuis cette interface (une session Claude Code ne peut pas l'éditer à ta
> place). Applique donc les réglages ci-dessous manuellement.

## Ordonnancement (jours ouvrés, lundi→vendredi)

1. **07h00 Paris — scraping quotidien** (`0 5 * * 1-5`) : récolte les nouveaux
   prospects + Instagram. Passe en premier pour alimenter le stock avant les envois.
2. **07h30 Paris — veille & brief** (`30 5 * * 1-5`) : traite les réponses
   (opt-out, refus, intérêt/audit) AVANT les envois, pour ne jamais relancer
   quelqu'un qui vient de se désinscrire.
3. **08h / 09h / 10h Paris — envoi & relances** (`0 6,7,8 * * 1-5`) : 3 passages
   pour étaler les envois sur la fenêtre 8h–11h. Le plafond se remplit en cumulé
   sur les 3 passages ; la liste DM mystère ne sort qu'au dernier passage.

## Suivi automatique

Chaque envoi met immédiatement à jour Airtable (statut + date de dernière
touche), et la veille resynchronise réponses/opt-out/rebonds chaque matin avant
les envois. `PROSPECTS_B2B` reste la source de vérité, à jour en continu.

---

## Routine 1 — Scraping quotidien (`0 5 * * 1-5`, 07h00 Paris)

N'envoie aucun email. Scrape de nouveaux prospects + Instagram, écrit dans Airtable.

```
Routine BotFlow — scraping quotidien de nouveaux prospects. Tu n'envoies AUCUN email. Tu scrapes de nouvelles cliniques esthétiques (France + Portugal), tu récupères email + Instagram, et tu les ajoutes dans Airtable.

PÉRIMÈTRE STRICT : tu opères UNIQUEMENT via les connecteurs Apify et Airtable. Ne lis, n'écris et ne modifie AUCUN fichier ; ne crée aucune branche git, aucun commit, aucune pull request ; ne touche jamais au dépôt de code.

Vérifie l'accès à mcp__apify__* et mcp__Airtable__*. Si l'un manque, ne fais rien et signale-le.
Airtable : base app7l6qJCDoWebj8s, table PROSPECTS_B2B (tblEc8k4ch3KQyosV). Champs : Entreprise fldgMy6uNB1VzY8p1, Email_Pro fld58zYs6jvtTEtRq, Niche fldLaYjjz8emj6u85, Pays fldBHhFIGDmXqu2BL, Statut_Outreach fldD933RiNGtt0ow2, Source_Principale fldmRIV5cbSut8hOc, Source_Detaillee fldOMMZbpgL0wVjvM, Date_Import fld6D3EqNCGguAYLW, Date_Scrape fld99YlGhGtlIEu26, Score_Fit fldJpEGAbI0ZE9fjT, Campagne fldjw6z4GCeTbSRAF, Contact_Alternatif fldNLD3B6VHsXxCMQ, Notes fldxMHf7VaEaeeFer.

CHOIX DES VILLES : choisis 2 villes de France et 2 du Portugal peu scrapées récemment (varie chaque jour).
France : Paris, Lyon, Marseille, Bordeaux, Toulouse, Nice, Nantes, Lille, Montpellier, Strasbourg.
Portugal : Lisboa, Porto, Braga, Aveiro, Coimbra, Faro, Setúbal, Cascais, Guimarães, Funchal.

SCRAPE (2 runs, langue unique par run) via mcp__apify__call-actor, acteur « compass/crawler-google-places » :
 - Run France : input { "searchStringsArray": ["clinique esthétique <villeFR1>","médecine esthétique <villeFR1>","clinique esthétique <villeFR2>","médecine esthétique <villeFR2>"], "maxCrawledPlacesPerSearch": 30, "language": "fr", "countryCode": "fr", "scrapeContacts": true, "skipClosedPlaces": true }, callOptions { "maxTotalChargeUsd": 1 }, waitSecs 0.
 - Run Portugal : idem avec ["clínica estética <villePT1>","medicina estética <villePT1>","clínica estética <villePT2>","medicina estética <villePT2>"], "language": "pt-PT", "countryCode": "pt", callOptions { "maxTotalChargeUsd": 1 }.
Attends la fin des runs (get-dataset jusqu'à itemCount stable), puis récupère les items (get-dataset-items) : title, city, categoryName, website, emails, instagrams, reviewsCount, permanentlyClosed, temporarilyClosed.

FILTRAGE de chaque fiche :
 - Ignore si permanentlyClosed/temporarilyClosed, ou si aucun email.
 - EXCLUS dentaire : si title/categoryName/website contient dental, dentária, medicina dentária, smile, denti, ortho, estomat.
 - DÉDUP : ignore si l'email existe déjà dans PROSPECTS_B2B (search_records sur Email_Pro).

ÉCRITURE (create_records_for_table, lots de 50, typecast=true) pour chaque fiche retenue :
 Entreprise=title ; Email_Pro=1er email ; Niche="Cliniques esthétiques" ; Pays="FR" ou "PT" ; Statut_Outreach="Non contacté" ; Source_Principale="Google Maps" ; Source_Detaillee="Google Maps - Cliniques esthétiques <Ville>" ; Date_Import et Date_Scrape = aujourd'hui ; Score_Fit = 2 si reviewsCount>=100 sinon 1 ; Campagne="<FR|PT>-<Ville>-<YYYY-MM>" ; Contact_Alternatif = "IG: <1er instagram>" si présent ; Notes = "<categoryName> · <city> · <website> · <reviewsCount> avis".

Termine par un compte-rendu : nb de nouveaux prospects par marché et par ville, nb avec Instagram, coût Apify total.
```

## Routine 2 — Veille & brief (`30 5 * * 1-5`, 07h30 Paris)

N'envoie aucun email. Traite les réponses AVANT les envois du jour.

```
Routine BotFlow — veille & brief. Tu n'envoies AUCUN email : lecture, mise à jour du CRM, brief.

PÉRIMÈTRE STRICT : tu opères UNIQUEMENT via les connecteurs Gmail et Airtable. Ne touche jamais au dépôt de code (aucun fichier, aucune branche git, aucun commit, aucune pull request).

Vérifie l'accès à mcp__Gmail__* et mcp__Airtable__*. Si l'un manque, ne fais rien et signale-le.
Airtable : base app7l6qJCDoWebj8s, table PROSPECTS_B2B (tblEc8k4ch3KQyosV). Champs : Email_Pro fld58zYs6jvtTEtRq, Statut_Outreach fldD933RiNGtt0ow2, Date_Derniere_Touche fldTxRLJTmSUY4QGF, Opt_Out fld4K0vNOtk4cC4J1, Source_Detaillee fldOMMZbpgL0wVjvM, Notes fldxMHf7VaEaeeFer, Entreprise fldgMy6uNB1VzY8p1.
1. Lis Gmail « in:inbox newer_than:2d ».
2. Retrouve chaque expéditeur dans PROSPECTS_B2B (via Email_Pro) et mets à jour :
 - Opt-out (STOP/désinscription/ne plus recevoir/unsubscribe) → Opt_Out=true + Statut « Refus » (obligatoire).
 - Rebond dur (mailer-daemon/address not found/550) → Statut « Email invalide ».
 - Refus poli (« pas intéressé »/« não estou interessado ») → Statut « Refus ».
 - Intérêt/demande d'audit (« audit »/« auditoria »/« sim, tenho interesse ») → Statut « Intéressé » + en tête du brief (l'opérateur répond avec le lien d'audit).
 - Réponse automatique (congés/accusé) → ne rien changer.
3. Relances dues (sans envoyer, hebdo) : « Touche 1 envoyée » ≥ 7 j → Touche 2 due ; « Touche 2 » ≥ 7 j → Touche 3 due. Par marché.
4. Brief court : opt-out/rebonds/refus traités, « Intéressé » à recontacter (priorité), relances dues, RDV repérés.
Ne déclenche jamais d'envoi. Termine par le brief.
```

## Routine 3 — Envoi & relances (`0 6,7,8 * * 1-5`, 08h/09h/10h Paris)

Envoie depuis contact.botflow@gmail.com, met à jour Airtable, 3 passages étalés.

```
Routine BotFlow — envoi & relances (fenêtre 8h-11h Europe/Paris, jours ouvrés). Tu ENVOIES des cold emails depuis contact.botflow@gmail.com et tu mets à jour Airtable.

PÉRIMÈTRE STRICT : tu opères UNIQUEMENT via les connecteurs Gmail et Airtable. Ne lis, n'écris et ne modifie AUCUN fichier ; ne crée aucune branche git, aucun commit, aucune pull request ; ne touche jamais au dépôt de code. Ta seule production = envoi d'emails, mise à jour d'Airtable, compte-rendu texte.

Vérifie d'abord l'accès à mcp__Gmail__* et mcp__Airtable__*. Si l'un manque, ne fais rien et signale-le.
Airtable : base app7l6qJCDoWebj8s, table PROSPECTS_B2B (tblEc8k4ch3KQyosV). Champs : Entreprise fldgMy6uNB1VzY8p1, Email_Pro fld58zYs6jvtTEtRq, Statut_Outreach fldD933RiNGtt0ow2, Date_Derniere_Touche fldTxRLJTmSUY4QGF, Opt_Out fld4K0vNOtk4cC4J1, Niche fldLaYjjz8emj6u85, Source_Detaillee fldOMMZbpgL0wVjvM, Contact_Alternatif fldNLD3B6VHsXxCMQ, Notes fldxMHf7VaEaeeFer.

CADENCE : cette routine se déclenche 3 fois le matin (08h, 09h, 10h Paris) pour étaler les envois. PLAFOND quotidien = 50, réparti en cumulé sur les 3 passages (≈17 au 1er, ≈34 au 2e, ≈50 au 3e). À CHAQUE passage, compte d'abord les envois DÉJÀ faits aujourd'hui (Date_Derniere_Touche = aujourd'hui) et n'envoie que le solde jusqu'au plafond cumulé du passage en cours, sans jamais dépasser 50 sur la journée. Priorité absolue aux relances.

Signature de tous les emails : « Yassine — Botflow.IA ». N'écris JAMAIS le mot « IA » dans le corps (on parle d'un « système automatisé sur mesure »). Le lien d'audit ne part JAMAIS dans ces emails (uniquement en réponse à un intérêt). N'utilise JAMAIS « -- » ni « — » comme séparateur entre blocs de texte ; ton humain, jamais robotique.

CONTRÔLE OPT-OUT AVANT CHAQUE ENVOI (RGPD, obligatoire) : avant d'envoyer à un contact, vérifie Opt_Out=false ET qu'aucune réponse STOP/désinscription n'est arrivée de lui (Gmail « in:inbox from:<email> »). Si STOP détecté : n'envoie pas, pose Opt_Out=true + Statut « Refus » + note datée, passe au suivant.

A. RELANCES (hebdo, priorité) : « Touche 1 envoyée » avec Date_Derniere_Touche ≥ 7 j → Touche 2 ; « Touche 2 » ≥ 7 j → Touche 3. Réponds DANS le fil d'origine (Gmail « to:<email> », dernier message). Puis Statut → Touche 2/Touche 3 + Date_Derniere_Touche = aujourd'hui.

B. NOUVEAUX (Touche 1) pour combler le solde : « Non contacté » AVEC email, marché France ou Portugal (Source_Detaillee). EXCLURE : niche « Dentistes » et toute clinique dentaire (nom/notes/site contenant dental, dentária, medicina dentária, smile, denti), Opt_Out=true, notes « doublon »/« déjà contacté ». Avant envoi, vérifie « in:sent to:<email> » : si déjà contacté, saute + corrige le statut. Personnalise la 1re phrase (ville + spécialité depuis Notes). Langue : PT pour Portugal, FR pour France. Puis Statut → « Touche 1 envoyée » + Date = aujourd'hui.

MODÈLES (remplace {Entreprise}/{ville}/{spécialité}) :

PT — Touche 1 — Assunto « O faturamento que escapa fora de horas » :
Bom dia,
Vi a {Entreprise}, em {ville}, e o vosso trabalho em {spécialité}. Reparo que grande parte dos pedidos de marcação chega ao fim do dia, ao fim de semana ou durante um tratamento quando ninguém pode responder. O cliente não espera: marca noutro sítio. A isto somam-se os no-shows e os antigos clientes que não voltam. É faturação que se perde todos os meses.
Colocamos à vossa disposição um sistema automatizado à medida, com a vossa marca, que responde a cada pedido em menos de um minuto no Instagram, WhatsApp e site, qualifica o cliente, marca a consulta, faz o seguimento automático, reativa antigos clientes e reduz os no-shows. Resultado: mais marcações, menos tarefas repetitivas no dia a dia.
Se tiver interesse, envio-lhe um link que faz uma auditoria gratuita à vossa clínica para calcular exatamente o que está a perder hoje e o que o sistema lhe pode trazer.
Com os melhores cumprimentos,
Yassine — Botflow.IA
Para não voltar a receber mensagens, responda «STOP».

PT — Touche 2 (fil, « Re: O faturamento… ») :
Bom dia,
Volto a contactá-lo rapidamente. Uma clínica que recebe apenas alguns pedidos por semana fora do horário perde facilmente vários milhares de euros em tratamentos para a concorrência todos os meses, sem contar os no-shows e os clientes que nunca mais voltam. O nosso sistema automatizado responde, qualifica, marca e faz o seguimento por si, 24h/dia, com a vossa marca.
Se quiser o número exato para a {Entreprise}, basta responder «auditoria».
Com os melhores cumprimentos,
Yassine — Botflow.IA
Para não voltar a receber mensagens, responda «STOP».

PT — Touche 3 (fil) :
Bom dia,
Prometo que esta é a minha última mensagem. Se não for prioridade para a {Entreprise} neste momento, compreendo. Mas se a ideia de recuperar as marcações que hoje lhe escapam fizer sentido, a minha proposta de auditoria gratuita mantém-se: uma palavra em resposta e envio-lhe o link.
Desejo-lhe uma excelente continuação,
Yassine — Botflow.IA
Para não voltar a receber mensagens, responda «STOP».

FR — Touche 1 — Objet « Le chiffre d'affaires qui vous échappe hors horaires » :
Bonjour,
Je me permets de vous écrire au sujet de {Entreprise}, à {ville}. Une grande partie des demandes de rendez-vous arrivent le soir, le week-end ou pendant un soin quand personne ne peut répondre. Le client n'attend pas : il réserve ailleurs. Ajoutez les no-shows et les anciens clients qui ne reviennent plus, et c'est du chiffre d'affaires qui part chaque mois.
On met à votre disposition un système automatisé sur mesure, à votre enseigne, qui répond à chaque demande en moins d'une minute sur Instagram, WhatsApp et votre site, qualifie le client, réserve le créneau, relance automatiquement, réactive vos anciens clients et réduit les no-shows. Résultat : plus de rendez-vous, moins de tâches répétitives.
Si cela vous intéresse, je vous envoie un lien qui audite gratuitement votre institut pour chiffrer ce que vous perdez aujourd'hui et ce que le système peut vous rapporter.
Bien à vous,
Yassine — Botflow.IA
Pour ne plus recevoir de messages, répondez « STOP ».

FR — Touche 2 (fil) : même angle, plus court, se termine par « répondez simplement "audit" ». FR — Touche 3 (fil) : message de clôture, l'offre d'audit tient toujours. Signature « Yassine — Botflow.IA » + opt-out à chaque fois.

Termine par un compte-rendu : nb relances T2/T3, nb nouveaux Touche 1, par marché.

LISTE DM MYSTÈRE : uniquement au DERNIER passage du matin (heure de déclenchement ≥ 10h Paris). Pour chaque prospect passé en « Touche 1 envoyée » aujourd'hui dont Contact_Alternatif contient « IG: », liste « Établissement → Instagram ». Aux passages de 08h et 09h, ne produis pas cette liste.
```

## Réponse aux prospects intéressés (manuel, tant que le lien d'audit n'existe pas)

La veille détecte et classe « Intéressé » les prospects qui répondent « audit »/
« auditoria », mais **aucune routine n'envoie automatiquement le lien** : il est
fourni par l'opérateur. Dès que le lien d'audit est disponible, on peut faire
répondre automatiquement la veille avec le modèle « Réponse-Audit » (voir
`templates-fr.md` / `templates-pt.md`, variable `{{LIEN_AUDIT}}`).
