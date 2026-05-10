import type { Metadata } from "next";
import { Shell, Hero, Section } from "@/components/site/Shell";

export const metadata: Metadata = {
  title: "Politique de confidentialité (RGPD)",
  description: "Politique de confidentialité Botflow — traitement des données personnelles conforme RGPD.",
  alternates: { canonical: "https://botflow-ia.fr/politique-confidentialite" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <Shell>
      <Hero
        eyebrow="Légal · RGPD"
        h1={<>Politique de confidentialité</>}
        lead="Botflow s'engage à protéger la confidentialité des données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés."
      />

      <Section eyebrow="Responsable" title="Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées sur botflow-ia.fr est <strong>Botflow</strong> (entreprise individuelle, exploitée par Yassine Amedah, Paris, France), joignable à <strong>contact.botflow@gmail.com</strong>.
        </p>
      </Section>

      <Section eyebrow="Données collectées" title="Quelles données nous collectons">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Formulaire de contact :</strong> nom, prénom, email, entreprise, taille entreprise, message, service intéressé.</li>
          <li><strong>Cookies analytiques :</strong> données de navigation anonymisées (pages vues, durée, source) via Google Analytics 4 (avec IP anonymisée).</li>
          <li><strong>Logs serveur :</strong> adresse IP, user-agent, conservés 12 mois maximum à des fins de sécurité.</li>
        </ul>
      </Section>

      <Section eyebrow="Finalités" title="Pourquoi nous traitons vos données">
        <ul style={{ paddingLeft: 20 }}>
          <li>Répondre à vos demandes de contact et de devis.</li>
          <li>Vous adresser des informations commerciales (uniquement avec consentement explicite).</li>
          <li>Mesurer l&apos;audience et améliorer le site (cookies analytiques avec consentement).</li>
          <li>Respecter nos obligations légales (comptabilité, conservation des contrats).</li>
        </ul>
      </Section>

      <Section eyebrow="Bases légales" title="Sur quoi se fonde le traitement">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Consentement</strong> — formulaire de contact, newsletter, cookies analytiques.</li>
          <li><strong>Exécution contractuelle</strong> — gestion projets, devis, facturation.</li>
          <li><strong>Obligation légale</strong> — conservation comptable, fiscale.</li>
          <li><strong>Intérêt légitime</strong> — sécurité du site, prévention de la fraude.</li>
        </ul>
      </Section>

      <Section eyebrow="Conservation" title="Durée de conservation">
        <ul style={{ paddingLeft: 20 }}>
          <li>Données prospects : 3 ans à compter du dernier contact.</li>
          <li>Données clients : durée de la relation contractuelle + 5 ans (obligation légale).</li>
          <li>Données comptables : 10 ans.</li>
          <li>Cookies : 13 mois maximum.</li>
        </ul>
      </Section>

      <Section eyebrow="Vos droits" title="Droits dont vous disposez">
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Accès</strong> à vos données.</li>
          <li><strong>Rectification</strong> des données inexactes.</li>
          <li><strong>Effacement</strong> (droit à l&apos;oubli).</li>
          <li><strong>Limitation</strong> du traitement.</li>
          <li><strong>Portabilité</strong> de vos données.</li>
          <li><strong>Opposition</strong> au traitement.</li>
          <li><strong>Retrait du consentement</strong> à tout moment.</li>
        </ul>
        <p>
          Pour exercer ces droits : <strong>contact.botflow@gmail.com</strong>. Réponse sous 30 jours. En cas de litige, vous pouvez saisir la <a style={{ color: "#d8f5c5" }} href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>.
        </p>
      </Section>

      <Section eyebrow="Sous-traitants" title="Transfert de données">
        <p>Nous utilisons les sous-traitants suivants, tous conformes RGPD :</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Vercel</strong> (hébergement) — États-Unis, clauses contractuelles types.</li>
          <li><strong>Google Analytics 4</strong> (analytique) — IP anonymisée, consentement requis.</li>
          <li><strong>Resend / Postmark</strong> (envoi emails transactionnels) — Europe.</li>
        </ul>
        <p>
          Pour les projets clients impliquant des données sensibles, hébergement <strong>Scaleway (Paris)</strong> ou <strong>OVH (Roubaix)</strong> par défaut.
        </p>
      </Section>

      <Section eyebrow="Cookies" title="Gestion des cookies">
        <p>
          Le site utilise uniquement des cookies essentiels (fonctionnement) et des cookies analytiques (avec votre consentement). Vous pouvez modifier vos préférences à tout moment via le bandeau de consentement.
        </p>
      </Section>

      <Section eyebrow="Mise à jour" title="Modifications">
        <p>
          La présente politique peut être mise à jour. Date de dernière mise à jour : 10 mai 2026.
        </p>
      </Section>
    </Shell>
  );
}
