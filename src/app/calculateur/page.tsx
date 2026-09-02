import type { Metadata } from "next";
import {
  Shell,
  Hero,
  Section,
  JsonLd,
  ORG_LD,
  breadcrumb,
  service,
} from "@/components/site/Shell";
import { CoutDuSilence } from "@/components/calculateur/cout-du-silence";

const URL = "https://www.botflow-ia.fr/calculateur";

export const metadata: Metadata = {
  title: "Calculateur — combien vous coûte le silence ?",
  description:
    "Estimez ce que vous coûtent les demandes clients laissées sans réponse à temps. Calcul transparent, hypothèses affichées et modifiables. Pas un résultat client, pas une promesse.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Combien vous coûte le silence ?",
    description:
      "Les demandes arrivent le soir et le week-end. Estimez ce qu'elles coûtent quand personne ne répond — calcul affiché en entier.",
    url: URL,
  },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd
        data={service(
          "Calculateur — coût des demandes clients sans réponse",
          "Outil d'estimation transparent : applique vos propres hypothèses (volume de demandes, part sans réponse, panier moyen) pour estimer le manque à gagner mensuel. Hypothèses affichées et modifiables.",
        )}
      />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "Calculateur", url: URL },
        ])}
      />

      <Hero
        eyebrow="Outil · Coût du silence"
        h1={
          <>
            Combien vous coûte{" "}
            <em
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontStyle: "italic",
              }}
            >
              le silence
            </em>{" "}
            ?
          </>
        }
        lead="Vous ne perdez pas les clients que vous voyez partir. Vous perdez ceux que vous ne voyez jamais écrire — le samedi soir, le dimanche, pendant que vous travaillez. Réglez les quatre curseurs sur vos hypothèses : le calcul s'affiche en entier, vous pouvez le contester ligne par ligne."
      />

      <Section>
        <CoutDuSilence />
      </Section>

      <Section
        eyebrow="Méthode"
        title="Pourquoi ce calcul est volontairement simple."
      >
        <p>
          Un outil qui sort un chiffre sans montrer son raisonnement demande de la
          confiance avant d&apos;en avoir mérité. Celui-ci fait l&apos;inverse : quatre
          hypothèses, une multiplication, et le détail écrit sous le résultat.
        </p>
        <p>
          Les valeurs par défaut ne sont pas des moyennes de marché — nous ne
          publions pas de statistique sectorielle que nous ne pourrions pas
          sourcer. Ce sont des ordres de grandeur, à remplacer par les vôtres.
          Deux entreprises du même métier obtiendront des résultats très
          différents, et c&apos;est normal&nbsp;: c&apos;est précisément pourquoi un
          calcul générique ne remplace pas un audit.
        </p>
      </Section>

      <Section eyebrow="Limites" title="Ce que ce chiffre n'est pas.">
        <ul style={{ paddingLeft: 20, display: "grid", gap: 10, margin: 0 }}>
          <li>
            <strong>Ce n&apos;est pas une mesure.</strong> L&apos;outil ne lit aucune de
            vos données. Il applique vos hypothèses, rien de plus.
          </li>
          <li>
            <strong>Ce n&apos;est pas un résultat client.</strong> Aucun chiffre affiché
            ici ne provient d&apos;un cas réel, et aucun n&apos;est présenté comme tel.
          </li>
          <li>
            <strong>Ce n&apos;est pas une promesse.</strong> Le montant estimé est un
            manque à gagner potentiel, pas un gain que nous nous engageons à
            récupérer.
          </li>
          <li>
            <strong>Ce n&apos;est pas un devis.</strong> Nos grilles tarifaires sont
            publiques et indépendantes de ce calcul.
          </li>
        </ul>
      </Section>

      <Section
        eyebrow="La suite"
        title="Remplacer les hypothèses par vos vrais chiffres."
      >
        <p>
          L&apos;audit gratuit dure trente minutes. Nous y regardons trois choses :
          le volume réel de demandes que vous recevez, votre délai de réponse
          effectif — y compris le soir et le week-end — et ce qui se perd entre
          les deux. Vous repartez avec le chiffre, que vous travailliez avec nous
          ou non.
        </p>
        <p style={{ marginBottom: 0 }}>
          Si l&apos;automatisation a du sens pour vous, nous installons{" "}
          <strong>Sofia</strong>, une assistante IA — annoncée comme telle à
          chaque échange, jamais déguisée en humaine — qui répond aux demandes
          entrantes, qualifie, et transmet à votre équipe dès qu&apos;un sujet
          sort de son périmètre.
        </p>
      </Section>
    </Shell>
  );
}
