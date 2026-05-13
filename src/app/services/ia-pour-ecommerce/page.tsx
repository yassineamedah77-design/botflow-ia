import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://botflow-ia.fr/services/ia-pour-ecommerce";

export const metadata: Metadata = {
  title: "IA pour e-commerce — Automatisation & agents | Botflow",
  description:
    "Solutions IA pour e-commerçants : agents support multilingues, génération fiches produit, scoring paniers, automatisation SAV. Shopify, WooCommerce, Prestashop.",
  alternates: { canonical: URL },
  openGraph: { title: "IA pour e-commerce", description: "Agents IA et workflows pour Shopify, WooCommerce, Prestashop.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("IA pour e-commerce", "Agents IA, génération de contenu produit, scoring panier et automatisation SAV pour e-commerçants.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "IA e-commerce", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · E-commerce"
        h1={<>IA pour <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>e-commerçants</em>.</>}
        lead="Botflow déploie des solutions IA spécifiquement pensées pour les e-commerçants français : agents support multilingues, génération de fiches produit à grande échelle, scoring de paniers abandonnés, automatisation du SAV. Compatible Shopify, WooCommerce, Prestashop."
      />

      <Section eyebrow="Cas d'usage" title="5 leviers IA pour e-commerçants">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Agent SAV multilingue 24/7</strong> — formé sur votre catalogue, conditions, FAQ. Résout 70% des demandes (livraison, retours, tailles).</li>
          <li><strong>Génération fiches produit</strong> — IA rédige titres, descriptions, balises SEO à partir d&apos;une photo et de quelques attributs. 100 fiches en 1 h.</li>
          <li><strong>Scoring panier abandonné</strong> — IA prédit la probabilité d&apos;achat et personnalise la relance (email, SMS, code promo).</li>
          <li><strong>Modération avis clients</strong> — détection automatique des faux avis, classement par sentiment, alertes négatives.</li>
          <li><strong>Reporting commercial</strong> — agrégation multi-canaux (Shopify, Meta Ads, Google Ads, Klaviyo) + résumé IA quotidien.</li>
        </ol>
      </Section>

      <Section eyebrow="Stack" title="Intégrations natives">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>CMS :</strong> Shopify, WooCommerce, Prestashop, BigCommerce, Magento.</li>
          <li><strong>Paiement :</strong> Stripe, PayPal, Mollie, Adyen.</li>
          <li><strong>Marketing :</strong> Klaviyo, Brevo, Mailchimp, ActiveCampaign.</li>
          <li><strong>Support :</strong> Gorgias, Zendesk, Crisp, Tidio.</li>
          <li><strong>Logistique :</strong> Sendcloud, Shippo, Boxtal.</li>
        </ul>
      </Section>

      <Section eyebrow="Résultats" title="Impact mesuré chez nos clients e-commerce">
        <ul style={{ paddingLeft: 20 }}>
          <li>Marketplace mode → <strong>−54% de tickets SAV</strong> en 8 semaines.</li>
          <li>D2C cosmétique → <strong>×5 volume de contenu produit</strong>, coût rédaction divisé par 4.</li>
          <li>Pure player équipement maison → <strong>+18% recouvrement paniers abandonnés</strong>.</li>
        </ul>
        <CTA label="Auditer mon e-commerce →" />
      </Section>
    </Shell>
  );
}
