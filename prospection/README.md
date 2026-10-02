# Système de prospection sortante — BotFlow IA

> Spécification opérationnelle. Sert de référence unique aux routines d'envoi, de
> relance et de détection de réponses exécutées depuis Claude (pas de n8n).
> Dernière mise à jour : 2026-09-21.

## Objectif

Remplir l'agenda de RDV découverte via cold email vers des cliniques /
cabinets d'esthétique et de dentaire. Produit vendu : assistant IA qui répond
aux demandes de RDV en moins d'une minute, 24h/24, et relance les no-shows.
Premier contact = pas de vente, on propose un **audit gratuit** qui chiffre les
demandes perdues (le lien de l'audit est fourni séparément, jamais en Touche 1).

## Marchés actifs

- **France** et **Portugal** : marchés prioritaires actuels.
- **Suisse** : en pause (data conservée, réactivable). Ne pas contacter pour l'instant.
- Cliniques suisses germanophones (« à contacter en allemand ») : hors périmètre (langues gérées = FR, PT).

## Source de vérité — Airtable

- Base : `CRM yass_IA` (`app7l6qJCDoWebj8s`).
- Table prospects : `PROSPECTS_B2B` (`tblEc8k4ch3KQyosV`).
- File d'envoi : `EMAILS_QUEUE` (`tblp1Ef57HoRHl5Ya`).
- Statuts (`Statut_Outreach`) : Non contacté → Touche 1 envoyée → Touche 2 →
  Touche 3 → Répondu / Intéressé / RDV pris / Refus / Hors cible / Email
  invalide / Séquence terminée.

## Canal d'envoi

- Boîte : **contact.botflow@gmail.com** (connecteur Gmail relié à ce compte).
- Expéditeur déjà « rodé » (historique d'envois), mais reprendre en douceur
  après toute coupure.

## Règles de déduplication (à appliquer AVANT tout envoi)

1. Exclure tout prospect dont `Statut_Outreach` n'est pas dans le cycle
   (Répondu, Intéressé, RDV pris, Refus, Hors cible, Email invalide,
   Séquence terminée).
2. Exclure tout prospect dont les `Notes` contiennent un marqueur de doublon
   (« ATTENTION doublon », « déjà contacté »).
3. Croiser l'email destinataire avec l'historique **Gmail « envoyés »**
   (`in:sent to:<email>`) : si déjà contacté, ne pas ré-envoyer.
4. Respecter `Opt_Out` = true (exclusion définitive, toutes campagnes).
5. **Exclure tout dentaire** : niche `Dentistes`, et aussi les cliniques
   dentaires mal étiquetées « Cliniques esthétiques » (nom/notes contenant
   « dental », « dentária », « medicina dentária », « Smile.up », etc.).
   Cible = esthétique uniquement.

## Scoring (heat)

Score de base 1, +1 si ≥ 100 avis Google (forte demande = beaucoup à récupérer).
Prioriser les prospects de score 2 dans l'ordre d'envoi.

## Cadence & fenêtre d'envoi

- Séquence : Touche 1 → +7 j Touche 2 → +7 j Touche 3 → arrêt sans réponse
  (une relance par semaine : T1 jour 0, T2 à J+7, T3 à J+14).
- Le lien d'audit ne part JAMAIS en Touche 1/2/3 : il est envoyé en réponse
  quand le prospect manifeste de l'intérêt (modèle « Réponse-Audit »).
- Fenêtre d'envoi : **8h–11h (heure de Paris)**, réparti (lots horaires).
- Volume cible : **50/jour**. Après une coupure, montée en charge :
  ~25/j pendant 2–3 jours, puis 50.

## Conformité (RGPD / cold email B2B)

- Cibles = adresses professionnelles, objet lié à leur activité.
- Opt-out présent sur chaque message (« répondez STOP »).
- Identité de l'expéditeur claire.
- Toute demande de désinscription → `Opt_Out` = true + statut Refus, immédiat.

## Détection des réponses (routine quotidienne)

Scanner `in:inbox` de la boîte. Classer :
- Refus explicite → statut **Refus**.
- Intérêt / demande d'audit → statut **Intéressé**, envoyer le modèle Réponse-Audit.
- Rebond dur (adresse/domaine introuvable) → **Email invalide**.
- Réponse automatique (congés, accusé) → ne rien changer, rester en séquence.
- Opt-out → `Opt_Out` = true + Refus.

## Routines (exécutées depuis Claude, pas n8n)

1. **Envoi du jour** : sélectionne les prospects éligibles (dédup ci-dessus),
   génère un mail personnalisé (nom si dispo, ville, spécialité) dans le ton
   posé de l'agence, envoie par lots horaires 8h–11h, met à jour le statut.
2. **Relances** (rythme hebdomadaire) : passe les Touche 1 dues (≥7 j) en
   Touche 2, les Touche 2 dues (≥7 j) en Touche 3, dans le même fil.
3. **Réponses/opt-out** : voir ci-dessus.
4. **Brief du matin** : synthèse des relances dues, réponses à traiter, RDV.

Ces routines sont **armées sur validation** : aucun envoi de masse n'est
déclenché sans l'accord de l'opérateur, et jamais avant la validation du ton.

## Modèles d'emails

Voir `templates-fr.md` et `templates-pt.md`. Variables : `{{Entreprise}}`,
`{{Ville}}`, `{{Prenom}}` (repli propre si absent), `{{Signature}}` =
« Yassine — Botflow.IA », `{{LIEN_AUDIT}}`.
Touche 1 : accroche orientée chiffre et bénéfice (CA perdu hors horaires,
no-shows, clients inactifs), présentation de l'agent IA sur mesure à l'enseigne
du prospect (répond en < 1 min sur Instagram/WhatsApp/site, qualifie, réserve,
relance, réactive, réduit les no-shows), puis offre d'audit gratuit formulée en
texte — aucun lien en Touche 1, opt-out obligatoire. Le lien d'audit ne part
qu'en réponse à un intérêt.
