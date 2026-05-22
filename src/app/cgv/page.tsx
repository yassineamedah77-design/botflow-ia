import type { Metadata } from "next";
import { Shell, Hero, Section } from "@/components/site/Shell";

export const metadata: Metadata = {
  title: "Conditions générales de vente (CGV)",
  description: "Conditions générales de vente Botflow — agence d'automatisation IA.",
  alternates: { canonical: "https://www.botflow-ia.fr/cgv" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <Shell>
      <Hero
        eyebrow="Légal · CGV"
        h1={<>Conditions générales de vente</>}
        lead="Les présentes conditions générales de vente (CGV) régissent les prestations de services fournies par Botflow à ses clients professionnels."
      />

      <Section eyebrow="Article 1" title="Objet">
        <p>
          Les présentes CGV s&apos;appliquent à toutes les prestations de services fournies par Botflow : audit, conception et déploiement de workflows d&apos;automatisation IA, développement d&apos;agents IA conversationnels, formation aux outils d&apos;IA générative, maintenance et accompagnement.
        </p>
      </Section>

      <Section eyebrow="Article 2" title="Devis et commande">
        <p>
          Chaque prestation fait l&apos;objet d&apos;un <strong>devis détaillé</strong> précisant le périmètre, le calendrier, les livrables et le prix. Le devis est valable 30 jours. La commande est ferme dès retour du devis signé et versement de l&apos;acompte (30% du montant total HT).
        </p>
      </Section>

      <Section eyebrow="Article 3" title="Prix et conditions de paiement">
        <p>
          Les prix sont indiqués en euros, hors taxes. La TVA applicable est de 20% sauf exonération. Échelonnement type :
        </p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>30%</strong> à la signature (acompte).</li>
          <li><strong>40%</strong> à mi-parcours.</li>
          <li><strong>30%</strong> à la livraison.</li>
        </ul>
        <p>
          Délai de paiement : <strong>30 jours fin de mois</strong>. Tout retard entraîne l&apos;application d&apos;une pénalité de retard égale à 3 fois le taux d&apos;intérêt légal, plus une indemnité forfaitaire de 40 € (article L441-10 du Code de commerce).
        </p>
      </Section>

      <Section eyebrow="Article 4" title="Livraison et acceptation">
        <p>
          Les délais de livraison sont indicatifs et fixés au devis. Le client dispose de <strong>15 jours</strong> à compter de la livraison pour formuler des réserves écrites. À défaut, les livrables sont réputés acceptés.
        </p>
      </Section>

      <Section eyebrow="Article 5" title="Propriété intellectuelle">
        <p>
          Les livrables (workflows, prompts, code spécifique) deviennent la propriété du client après paiement intégral. Botflow conserve la propriété de ses outils, méthodologies, librairies internes et savoir-faire préexistants. Botflow se réserve le droit de mentionner le projet en référence commerciale, sauf clause de confidentialité explicite.
        </p>
      </Section>

      <Section eyebrow="Article 6" title="Confidentialité">
        <p>
          Botflow s&apos;engage à conserver la confidentialité de toutes les informations communiquées par le client. Un NDA peut être signé à la demande. Botflow utilise des hébergements européens (Scaleway, OVH) pour les projets impliquant des données sensibles.
        </p>
      </Section>

      <Section eyebrow="Article 7" title="Garantie et maintenance">
        <p>
          Tout projet inclut <strong>3 mois de monitoring</strong> à compter de la livraison : surveillance des performances, corrections de bugs, ajustements mineurs. Au-delà, une maintenance optionnelle peut être souscrite par contrat séparé.
        </p>
      </Section>

      <Section eyebrow="Article 8" title="Responsabilité">
        <p>
          Botflow s&apos;engage à apporter tous ses soins et compétences à la réalisation des prestations (obligation de moyens). La responsabilité de Botflow est plafonnée au montant total HT facturé au titre du projet concerné. Botflow ne peut être tenu responsable des dommages indirects (perte de chiffre d&apos;affaires, perte de données, atteinte à l&apos;image).
        </p>
      </Section>

      <Section eyebrow="Article 9" title="Résiliation">
        <p>
          En cas de manquement grave de l&apos;une des parties, l&apos;autre partie peut résilier le contrat après mise en demeure restée infructueuse pendant 15 jours. Les sommes dues pour les prestations déjà réalisées restent exigibles.
        </p>
      </Section>

      <Section eyebrow="Article 10" title="Droit applicable et litiges">
        <p>
          Les présentes CGV sont soumises au <strong>droit français</strong>. En cas de litige, les parties s&apos;engagent à rechercher une solution amiable avant toute action judiciaire. À défaut, compétence exclusive est attribuée aux <strong>tribunaux du ressort de Paris</strong>.
        </p>
      </Section>

      <Section eyebrow="Mise à jour" title="Version">
        <p>Dernière mise à jour : 10 mai 2026.</p>
      </Section>
    </Shell>
  );
}
