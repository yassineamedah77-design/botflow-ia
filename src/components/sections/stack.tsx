"use client";

import { motion } from "framer-motion";

const groups = [
  {
    title: "Agents IA",
    items: [
      "GPT-4 / o1",
      "Claude Sonnet / Opus",
      "Gemini",
      "Llama 3",
      "Mistral",
      "RAG / Embeddings",
    ],
  },
  {
    title: "Automatisation",
    items: [
      "n8n",
      "Make",
      "Zapier",
      "Workflows custom",
      "Pipedream",
      "Trigger.dev",
    ],
  },
  {
    title: "Intégrations",
    items: [
      "HubSpot",
      "Salesforce",
      "Slack",
      "Notion",
      "Airtable",
      "Stripe",
      "Shopify",
      "Linear",
    ],
  },
  {
    title: "Data & Vector",
    items: [
      "Pinecone",
      "Weaviate",
      "Supabase",
      "PostgreSQL",
      "BigQuery",
      "Hex",
    ],
  },
];

export function Stack() {
  return (
    <section id="stack" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
        >
          <div>
            <p className="text-xs tracking-widest uppercase text-[var(--accent)] mb-4">
              Expertise
            </p>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight max-w-2xl">
              Notre stack{" "}
              <span className="font-serif-italic text-[var(--fg-muted)]">
                technique
              </span>
              .
            </h2>
          </div>
          <p className="text-[var(--fg-muted)] max-w-md">
            Nous sélectionnons les meilleurs outils du marché pour chaque
            mission. Aucun lock-in technologique.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {groups.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.1 }}
              className="rounded-3xl border border-[var(--border)] p-8 hover:border-[var(--accent)]/30 transition-colors"
            >
              <h3 className="text-xl font-medium tracking-tight mb-6">
                {g.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {g.items.map((item, j) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: j * 0.04 }}
                    whileHover={{ y: -2 }}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all cursor-default"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
