"use client";

/**
 * Last-resort boundary when the root layout itself fails. It renders its own
 * document without the app's stylesheet, so styles are inline.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f5",
          color: "#161514",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <title>Erreur · SOFIA</title>
        <main>
          <p style={{ fontWeight: 700, letterSpacing: "0.16em" }}>
            SOFIA<span style={{ color: "#d97757" }}>.</span>
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "24px 0 8px" }}>Le service rencontre un problème</h1>
          <p style={{ color: "#6e685f", maxWidth: 420, lineHeight: 1.6 }}>
            L&apos;incident a été enregistré{error.digest ? ` (référence ${error.digest})` : ""}. Réessayez dans un instant.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              height: 40,
              padding: "0 18px",
              borderRadius: 10,
              border: 0,
              background: "#161514",
              color: "#faf8f5",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
