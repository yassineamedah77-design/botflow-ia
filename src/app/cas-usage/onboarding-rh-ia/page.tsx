import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb } from "@/components/site/Shell";

const URL = "https://botflow-ia.fr/cas-usage/onboarding-rh-ia";

export const metadata: Metadata = {
  title: "Automatiser onboarding RH avec l'IA — Cas d'usage | Botflow",
  description:
    "Workflow IA pour l'onboarding RH : génération contrats, création comptes SI, planification formations, suivi 30/60/90 jours. −85% tâches manuelles. Étude de cas Vertex Industries.",
  alternates: { canonical: URL },
  openGraph: { title: "Automatiser onboarding RH avec l'IA", description: "Workflow IA RH : −85% de tâches manuelles.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "Cas d'usage", url: "https://botflow-ia.fr/cas-usage/onboarding-rh-ia" },
          { name: "Onboarding RH IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Cas d'usage · RH"
        h1={<>Automatiser l&apos;onboarding RH avec l&apos;<em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>IA</em>.</>}
        lead="Un nouvel arrivant doit être prêt dès J1 : contrat signé, comptes SI créés, formations planifiées, équipement livré, parcours 30/60/90 jours. Botflow orchestre toute la chaîne via n8n + Claude. Setup nouvel arrivant : 1 jour, contre 2 semaines en manuel."
      />

      <Section eyebrow="Le problème" title="L'onboarding RH = 40 tâches répétitives par profil">
        <p>
          Pour chaque nouvel arrivant, les RH gèrent en moyenne 30 à 40 tâches : génération du contrat depuis le template métier, demande signature électronique, création des comptes (Google Workspace, Slack, GitHub, Notion, CRM), commande matériel, planification des sessions de formation, envoi du welcome pack, suivi à 30/60/90 jours. <strong>Coût caché : 8 à 15 heures par profil.</strong>
        </p>
      </Section>

      <Section eyebrow="La solution" title="Workflow IA orchestré bout-en-bout">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Déclenchement</strong> — signature du candidat dans l&apos;ATS (Lever, Welcome to the Jungle, Greenhouse).</li>
          <li><strong>Génération contrat</strong> — Claude rédige le contrat à partir du template + données candidat (poste, salaire, période d&apos;essai), validation RH en 1 clic.</li>
          <li><strong>Signature électronique</strong> — DocuSign ou Yousign auto-déclenchée.</li>
          <li><strong>Création comptes SI</strong> — n8n crée Google Workspace, Slack, GitHub, Notion, HubSpot. Permissions par rôle.</li>
          <li><strong>Planification formations</strong> — Cal.com / Google Calendar : sessions intégration métier, RGPD, sécurité.</li>
          <li><strong>Welcome pack</strong> — email personnalisé Claude + commande équipement.</li>
          <li><strong>Suivi 30/60/90</strong> — questionnaires automatiques, alerte manager si signaux d&apos;alarme.</li>
        </ol>
      </Section>

      <Section eyebrow="Résultats client" title="Vertex Industries — étude de cas">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>−85% de tâches manuelles</strong> sur l&apos;équipe RH.</li>
          <li><strong>Setup nouvel arrivant</strong> : 14 jours → <strong>1 jour</strong>.</li>
          <li><strong>32 profils onboardés</strong> sur 6 mois sans renforcer l&apos;équipe RH.</li>
          <li><strong>NPS arrivants</strong> : +28 points (process fluide vs avant).</li>
        </ul>
      </Section>

      <Section eyebrow="Sécurité & conformité" title="RGPD et données salariés">
        <p>
          Les données salariés sont sensibles. Hébergement européen obligatoire (Scaleway, OVH ou votre infra). Chiffrement bout-en-bout. Logs d&apos;audit accessibles. Aucune donnée n&apos;est utilisée pour entraîner les modèles. DPA fourni au DPO. Possibilité d&apos;exécution on-premise pour secteurs réglementés.
        </p>
      </Section>

      <Section eyebrow="Adapter à votre entreprise" title="Déploiement type">
        <p>
          Un workflow onboarding RH IA standard est livré en <strong>5 à 8 semaines</strong>. Le ROI est atteint dès <strong>10 à 15 onboardings</strong>. Pour les structures avec turnover important ou croissance rapide, c&apos;est l&apos;un des projets les plus rentables.
        </p>
        <p>
          Voir aussi : <a style={{ color: "#d8f5c5" }} href="/services/automatisation-workflow-ia">Service workflows IA</a> · <a style={{ color: "#d8f5c5" }} href="/cas-usage/automatiser-devis-ia">Cas devis IA</a>.
        </p>
        <CTA label="Auditer mon onboarding →" />
      </Section>
    </Shell>
  );
}
