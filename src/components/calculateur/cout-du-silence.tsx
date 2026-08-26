"use client";

import { useMemo, useState } from "react";

const ACCENT = "#7afca5";
const MINT = "#d8f5c5";
const CALENDLY = "https://calendly.com/yass_automat-ia/new-meeting";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Formatage déterministe (pas d'Intl) : évite tout écart d'hydratation
 * entre l'ICU de Node et celui du navigateur.
 */
function groupe(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function euros(n: number) {
  return `${groupe(n)} €`;
}

type Champ = {
  cle: "demandes" | "sansReponse" | "conversion" | "panier";
  label: string;
  aide: string;
  min: number;
  max: number;
  pas: number;
  suffixe: string;
};

const CHAMPS: Champ[] = [
  {
    cle: "demandes",
    label: "Demandes reçues par mois",
    aide: "DM Instagram, WhatsApp, appels, formulaires — toutes sources confondues.",
    min: 20,
    max: 1000,
    pas: 10,
    suffixe: "demandes",
  },
  {
    cle: "sansReponse",
    label: "Part laissée sans réponse à temps",
    aide: "Les demandes qui arrivent le soir, le week-end, ou pendant que vous travaillez — et qui attendent trop longtemps.",
    min: 0,
    max: 60,
    pas: 1,
    suffixe: "%",
  },
  {
    cle: "conversion",
    label: "Part de ces demandes qui auraient abouti",
    aide: "À 100 %, vous supposez que chaque demande sans réponse était un client. C'est l'hypothèse la plus optimiste — baissez-la pour une estimation prudente.",
    min: 0,
    max: 100,
    pas: 5,
    suffixe: "%",
  },
  {
    cle: "panier",
    label: "Panier moyen",
    aide: "Le montant moyen d'une prestation, ou la valeur d'un premier rendez-vous.",
    min: 20,
    max: 2000,
    pas: 10,
    suffixe: "€",
  },
];

export function CoutDuSilence() {
  const [valeurs, setValeurs] = useState({
    demandes: 200,
    sansReponse: 15,
    conversion: 100,
    panier: 150,
  });

  const { perduesParMois, mensuel, annuel } = useMemo(() => {
    const perdues = (valeurs.demandes * valeurs.sansReponse) / 100;
    const mois = (perdues * valeurs.conversion * valeurs.panier) / 100;
    return { perduesParMois: perdues, mensuel: mois, annuel: mois * 12 };
  }, [valeurs]);

  const optimiste = valeurs.conversion === 100;

  function onCta() {
    window.gtag?.("event", "audit_cta_click", {
      event_category: "conversion",
      event_label: "calculateur-cout-du-silence",
      value: Math.round(mensuel),
    });
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <div
        style={{
          display: "grid",
          gap: 28,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          alignItems: "start",
        }}
      >
        {/* ---------- Hypothèses ---------- */}
        <div
          style={{
            padding: 28,
            borderRadius: 18,
            background: "rgba(15,16,14,.6)",
            border: "1px solid rgba(255,255,255,.08)",
            display: "grid",
            gap: 26,
          }}
        >
          <div
            style={{
              color: MINT,
              fontSize: 12,
              letterSpacing: ".22em",
              textTransform: "uppercase",
            }}
          >
            Vos hypothèses
          </div>

          {CHAMPS.map((champ) => {
            const valeur = valeurs[champ.cle];
            return (
              <div key={champ.cle} style={{ display: "grid", gap: 8 }}>
                <label
                  htmlFor={champ.cle}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    fontSize: 15,
                    color: "#e9efe5",
                  }}
                >
                  <span>{champ.label}</span>
                  <span
                    style={{
                      color: ACCENT,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {groupe(valeur)}
                    <span style={{ color: "#8a948a", fontWeight: 400 }}>
                      {" "}
                      {champ.suffixe}
                    </span>
                  </span>
                </label>

                <input
                  id={champ.cle}
                  type="range"
                  min={champ.min}
                  max={champ.max}
                  step={champ.pas}
                  value={valeur}
                  onChange={(e) =>
                    setValeurs((v) => ({
                      ...v,
                      [champ.cle]: Number(e.target.value),
                    }))
                  }
                  aria-describedby={`${champ.cle}-aide`}
                  style={{ width: "100%", accentColor: ACCENT, cursor: "pointer" }}
                />

                <p
                  id={`${champ.cle}-aide`}
                  style={{ margin: 0, fontSize: 13, color: "#8a948a", lineHeight: 1.5 }}
                >
                  {champ.aide}
                </p>
              </div>
            );
          })}
        </div>

        {/* ---------- Résultat ---------- */}
        <div
          style={{
            padding: 28,
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(122,252,165,.10), rgba(122,252,165,.02))",
            border: "1px solid rgba(122,252,165,.28)",
            display: "grid",
            gap: 20,
          }}
        >
          <div
            style={{
              color: MINT,
              fontSize: 12,
              letterSpacing: ".22em",
              textTransform: "uppercase",
            }}
          >
            Ce que le silence vous coûte
          </div>

          <div aria-live="polite">
            <div
              style={{
                fontSize: "clamp(38px,6vw,64px)",
                fontWeight: 600,
                letterSpacing: "-.03em",
                lineHeight: 1,
                color: "#e9efe5",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {euros(mensuel)}
            </div>
            <div style={{ marginTop: 8, color: "#8a948a", fontSize: 15 }}>
              par mois, soit{" "}
              <strong style={{ color: "#cfd6cd", fontWeight: 600 }}>
                {euros(annuel)}
              </strong>{" "}
              sur douze mois.
            </div>
          </div>

          {/* Le calcul, écrit en toutes lettres */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "rgba(0,0,0,.28)",
              border: "1px solid rgba(255,255,255,.07)",
              fontSize: 14,
              lineHeight: 1.7,
              color: "#cfd6cd",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ color: "#8a948a", marginBottom: 6 }}>Le calcul :</div>
            {groupe(valeurs.demandes)} demandes × {valeurs.sansReponse}
            {" "}% sans réponse = <strong>{groupe(perduesParMois)}</strong>{" "}
            demandes perdues par mois.
            <br />
            {groupe(perduesParMois)} × {valeurs.conversion}
            {" "}% × {euros(valeurs.panier)} ={" "}
            <strong style={{ color: ACCENT }}>{euros(mensuel)}</strong> par mois.
          </div>

          {optimiste && (
            <p
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#cfd6cd",
              }}
            >
              Vous êtes à <strong>100&nbsp;%</strong> : ce chiffre suppose que{" "}
              <em>chaque</em>{" "}
              demande sans réponse serait devenue un client.
              C&apos;est le haut de la fourchette. Baissez le curseur pour une
              estimation plus prudente.
            </p>
          )}

          <div>
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onCta}
              style={{
                display: "inline-flex",
                padding: "15px 26px",
                borderRadius: 14,
                background:
                  "linear-gradient(180deg,rgba(122,252,165,.22),rgba(122,252,165,.06))",
                border: "1px solid rgba(122,252,165,.4)",
                color: "#e9efe5",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Mesurer mes vrais chiffres — audit gratuit →
            </a>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 13,
                color: "#8a948a",
                lineHeight: 1.6,
              }}
            >
              30 minutes. On mesure votre volume réel de demandes, votre délai de
              réponse effectif, et ce qui se perd entre les deux. Sans engagement.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Mention obligatoire + limites ---------- */}
      <div
        style={{
          padding: "20px 22px",
          borderRadius: 14,
          background: "rgba(15,16,14,.5)",
          border: "1px solid rgba(255,255,255,.08)",
          fontSize: 14,
          lineHeight: 1.7,
          color: "#8a948a",
        }}
      >
        <strong style={{ color: "#cfd6cd" }}>
          Exemple chiffré, hypothèses affichées — pas un résultat client.
        </strong>{" "}
        Cet outil ne mesure rien : il applique vos hypothèses à une
        multiplication, et affiche le calcul en entier pour que vous puissiez le
        contester. Il ne prédit aucun gain, ne promet aucune performance, et ne
        remplace pas l&apos;examen de vos données réelles. Les valeurs par défaut
        sont des ordres de grandeur, pas des moyennes de marché.
      </div>
    </div>
  );
}
