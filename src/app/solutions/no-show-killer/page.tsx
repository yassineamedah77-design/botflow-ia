import type { Metadata } from "next";
import {
  Shell,
  Hero,
  Section,
  CTA,
  JsonLd,
  ORG_LD,
  breadcrumb,
  service,
} from "@/components/site/Shell";

const URL = "https://www.botflow-ia.fr/solutions/no-show-killer";

export const metadata: Metadata = {
  title:
    "NoShow Killer — Éliminez 80% des no-show de votre clinique en 14 jours",
  description:
    "Système WhatsApp + IA pour cliniques dentaires & esthétiques 1-3 praticiens. Confirmation RDV, relance no-show, liste d'attente intelligente. Setup 2 990 € HT, livraison 14 jours.",
  alternates: { canonical: URL },
  openGraph: {
    title: "NoShow Killer — −80% de no-show en 14 jours",
    description:
      "Confirmation RDV WhatsApp + relance no-show automatique. Setup 2 990 €. Conforme RGPD.",
    url: URL,
  },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd
        data={service(
          "NoShow Killer — Automatisation no-show pour cliniques",
          "Système WhatsApp + IA qui élimine 80% des no-show en cliniques dentaires et esthétiques. Confirmation RDV automatique, relance, liste d'attente intelligente.",
        )}
      />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "Solutions", url: "https://www.botflow-ia.fr/" },
          { name: "NoShow Killer", url: URL },
        ])}
      />

      <Hero
        eyebrow="Solution · NoShow Killer"
        h1={
          <>
            Éliminez{" "}
            <em
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontStyle: "italic",
              }}
            >
              80% de vos no-show
            </em>{" "}
            en 14 jours.
          </>
        }
        lead="Une clinique 3 praticiens à 15% de no-show perd ~9 000 € de CA chaque mois. NoShow Killer descend ce taux à 3-4% en 30 jours, sans changer votre logiciel métier."
      />

      <Section>
        <CTA label="Démarrer NoShow Killer →" />
      </Section>

      <Section
        eyebrow="Pour qui"
        title="Cliniques dentaires & esthétiques de 1 à 3 praticiens."
      >
        <p>
          Vous gérez 1 à 3 praticiens. Votre logiciel métier (Logos, Julie,
          Veasy, Doctolib…) est en place. Votre douleur n°1 : les patients qui
          ne se présentent pas. Vous voulez un système qui fonctionne en 14
          jours, sans refondre tout votre stack.
        </p>
        <p style={{ marginTop: 16 }}>
          NoShow Killer ne remplace ni votre secrétaire ni Doctolib. Il pose une
          couche d'automatisation WhatsApp + IA par-dessus votre agenda
          existant.
        </p>
      </Section>

      <Section
        eyebrow="Inclus"
        title="Tout ce qui est installé en 14 jours."
      >
        <ul style={{ paddingLeft: 20, lineHeight: 1.9 }}>
          <li>
            <strong>WhatsApp Business API</strong> + numéro pro dédié à votre
            clinique
          </li>
          <li>
            <strong>Confirmation automatique J-3 / J-1 / H-2</strong> dans votre
            voix, avec lien reprogrammation 1 clic
          </li>
          <li>
            <strong>Détection no-show + relance</strong> automatique sous 30 min
            (avec option reprise RDV)
          </li>
          <li>
            <strong>Liste d'attente intelligente</strong> — créneau libéré
            comblé en {"<"}1 h via WhatsApp aux patients en attente
          </li>
          <li>
            <strong>Sync agenda</strong> bidirectionnelle (Logos, Julie, Veasy,
            OrisLine, Doctolib, Google Calendar)
          </li>
          <li>
            <strong>Dashboard mensuel</strong> : no-show évités, € récupérés,
            taux de confirmation, créneaux re-comblés
          </li>
          <li>
            <strong>Formation équipe 1 h</strong> + support WhatsApp direct
            pendant 30 jours
          </li>
          <li>
            <strong>Pack conformité</strong> RGPD + déontologie médicale
            (consentement, DPA, registre)
          </li>
        </ul>
      </Section>

      <Section eyebrow="Pricing" title="Setup et maintenance.">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              border: "1px solid rgba(122,252,165,.3)",
              background: "rgba(122,252,165,.05)",
            }}
          >
            <div style={{ fontSize: 13, color: "#8a948a", letterSpacing: ".2em" }}>
              SETUP
            </div>
            <div
              style={{
                fontSize: 36,
                color: "#e9efe5",
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              2 990 € HT
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: "#cfd6cd" }}>
              Paiement une fois. Livraison 14 jours ouvrés après signature.
            </p>
          </div>
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.03)",
            }}
          >
            <div style={{ fontSize: 13, color: "#8a948a", letterSpacing: ".2em" }}>
              MAINTENANCE
            </div>
            <div
              style={{
                fontSize: 36,
                color: "#e9efe5",
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              390 € HT/mois
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: "#cfd6cd" }}>
              Hébergement, maintenance, ajustements illimités, support. Engagement
              12 mois.
            </p>
          </div>
        </div>
        <p style={{ marginTop: 20, color: "#d8f5c5", fontSize: 14 }}>
          🛡️ Garantie 30 jours satisfait ou remboursé sur le setup.
        </p>
      </Section>

      <Section eyebrow="ROI" title="Combien vous récupérez en 30 jours.">
        <p>
          Exemple concret — clinique dentaire 3 praticiens, Paris 9ème :
        </p>
        <ul style={{ paddingLeft: 20, lineHeight: 1.9 }}>
          <li>30 RDV/jour × 22 jours ouvrés = 660 RDV/mois</li>
          <li>Taux no-show actuel 15% = 99 RDV perdus / mois</li>
          <li>Ticket moyen 90 € → <strong>~8 910 € de CA évaporé / mois</strong></li>
          <li>
            Avec NoShow Killer (no-show à 3%) = 20 RDV perdus / mois →{" "}
            <strong>~7 110 € récupérés / mois</strong>
          </li>
          <li>ROI net : setup (2 990 €) amorti en <strong>13 jours</strong>.</li>
        </ul>
        <CTA label="Calculer mon ROI précis (15 min) →" />
      </Section>

      <Section
        eyebrow="Process"
        title="Du premier appel à la production en 14 jours."
      >
        <ol style={{ paddingLeft: 20, lineHeight: 1.9 }}>
          <li><strong>J1</strong> — Audit gratuit 15 min (calcul pertes no-show + objectifs)</li>
          <li><strong>J2</strong> — Proposition + signature</li>
          <li><strong>J3-J5</strong> — Setup technique (WhatsApp API, sync logiciel, training IA)</li>
          <li><strong>J6-J10</strong> — Tests internes + ajustements scripts</li>
          <li><strong>J11</strong> — Formation équipe (1 h visio)</li>
          <li><strong>J12-J13</strong> — Lancement progressif (10% trafic → 100%)</li>
          <li><strong>J14</strong> — Production complète + 1er reporting</li>
        </ol>
      </Section>

      <Section
        eyebrow="Et après ?"
        title="Quand votre clinique grossit, NoShow Killer évolue."
      >
        <p>
          NoShow Killer est l'offre de départ. Quand vous voudrez aller plus
          loin (qualif leads Instagram, devis IA, upsell, bot vocal), upgrade
          possible à tout moment vers <strong>Lead Magnet Esthétique</strong>{" "}
          (4 990 € HT) ou <strong>Clinique OS</strong> (7 990 € HT). Le setup
          NoShow Killer est crédité sur l'upgrade.
        </p>
        <CTA label="Réserver mon audit gratuit (15 min) →" />
      </Section>
    </Shell>
  );
}
