import type { Metadata } from "next";
import { Shell, Hero, Section } from "@/components/site/Shell";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de Botflow — agence d'automatisation IA.",
  alternates: { canonical: "https://botflow-ia.fr/mentions-legales" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <Shell>
      <Hero
        eyebrow="Légal"
        h1={<>Mentions légales</>}
        lead="Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique."
      />

      <Section eyebrow="Éditeur" title="Éditeur du site">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Dénomination :</strong> Botflow</li>
          <li><strong>Forme juridique :</strong> Entreprise Individuelle (micro-entreprise)</li>
          <li><strong>Exploitant :</strong> Yassine Amedah</li>
          <li><strong>Siège social :</strong> Paris, France (75)</li>
          <li><strong>SIRET :</strong> En cours d&apos;immatriculation</li>
          <li><strong>Code APE :</strong> 6202A — Conseil en systèmes et logiciels informatiques</li>
          <li><strong>TVA :</strong> Non applicable, article 293 B du CGI (franchise en base de TVA)</li>
          <li><strong>RCS :</strong> Non applicable — activité libérale dispensée d&apos;immatriculation au RCS</li>
          <li><strong>Directeur de la publication :</strong> Yassine Amedah</li>
          <li><strong>Email :</strong> contact.botflow@gmail.com</li>
        </ul>
        <p style={{ marginTop: 12, fontSize: 13, color: "#8a948a" }}>
          Les informations administratives définitives (SIRET, adresse complète) seront mises à jour dès finalisation de l&apos;immatriculation auprès du Guichet Unique INPI.
        </p>
      </Section>

      <Section eyebrow="Hébergement" title="Hébergeur du site">
        <p>
          Le site botflow-ia.fr est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Site web : <a style={{ color: "#d8f5c5" }} href="https://vercel.com" target="_blank" rel="noopener">vercel.com</a>.
        </p>
        <p>
          [Si self-host OVH/Scaleway : remplacer par les coordonnées de l&apos;hébergeur réel.]
        </p>
      </Section>

      <Section eyebrow="Propriété intellectuelle" title="Droits d'auteur">
        <p>
          L&apos;ensemble du contenu du site botflow-ia.fr (textes, graphismes, logos, icônes, images, vidéos, code) est la propriété exclusive de Botflow ou de ses partenaires. Toute reproduction, représentation, modification, publication, adaptation totale ou partielle est interdite sans autorisation écrite préalable.
        </p>
      </Section>

      <Section eyebrow="Responsabilité" title="Limitation de responsabilité">
        <p>
          Botflow met tout en œuvre pour offrir des informations fiables et à jour. Cependant, des erreurs ou omissions peuvent survenir. Botflow ne saurait être tenu responsable des dommages directs ou indirects résultant de l&apos;accès ou de l&apos;utilisation du site.
        </p>
      </Section>

      <Section eyebrow="Contact" title="Nous contacter">
        <p>Pour toute question relative aux mentions légales : contact.botflow@gmail.com</p>
      </Section>
    </Shell>
  );
}
