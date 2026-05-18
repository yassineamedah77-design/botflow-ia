import { ImageResponse } from "next/og";

export const alt =
  "BotFlow IA — Sofia, l'IA pour cliniques esthétiques & instituts de beauté";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(circle at 30% 30%, rgba(122,252,165,.35), transparent 55%), radial-gradient(circle at 70% 70%, rgba(120,180,255,.15), transparent 55%), #070806",
          color: "#e9efe5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#7afca5",
              boxShadow: "0 0 30px #7afca5",
            }}
          />
          <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: "0.5px" }}>
            BotFlow IA
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 500,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: 1040,
              color: "#e9efe5",
            }}
          >
            Vos DM, vos heures creuses, deviennent des rendez-vous.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#cfd6cd",
              maxWidth: 1000,
              lineHeight: 1.3,
            }}
          >
            Sofia, l'IA pour cliniques esthétiques & instituts de beauté · 🇫🇷 FR · 🇵🇹 PT · 🇬🇧 EN
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#8a948a",
          }}
        >
          <div>botflow-ia.fr</div>
          <div style={{ color: "#d8f5c5" }}>
            Audit gratuit · Conforme RGPD
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
