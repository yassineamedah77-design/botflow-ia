# Déploiement botflow-ia.fr

## 1. Push GitHub

```bash
cd ~/automat.IA/botflow-ia
git init
git add .
git commit -m "Initial commit: landing + SEO pages"
gh repo create botflow-ia --public --source=. --push
```

Si pas de gh CLI : créer repo sur github.com puis :
```bash
git remote add origin https://github.com/<user>/botflow-ia.git
git push -u origin main
```

## 2. Déployer Vercel

1. https://vercel.com/new
2. "Import Git Repository" → choisir botflow-ia
3. Framework Preset : Next.js (auto-détecté)
4. Cliquer **Deploy** — premier déploiement sans env vars

Vercel donne URL temporaire : `botflow-ia-xxx.vercel.app`

## 3. DNS Infomaniak → Vercel

Dans **Vercel** : Settings → Domains → Add → `botflow-ia.fr` puis `www.botflow-ia.fr`

Vercel affiche 2 records DNS à ajouter dans **Infomaniak**.

Aller dans Infomaniak : Domaine `botflow-ia.fr` → DNS → Modifier zone DNS.

Ajouter :

| Type  | Nom  | Valeur                    | TTL  |
|-------|------|---------------------------|------|
| A     | @    | `76.76.21.21`             | 3600 |
| CNAME | www  | `cname.vercel-dns.com.`   | 3600 |

Supprimer tout autre record A/AAAA/CNAME conflictuel sur @ et www.

Propagation DNS : 1 à 24h. Vérifier sur https://dnschecker.org

## 4. Variables d'environnement Vercel

Vercel → Settings → Environment Variables → Add :

```
NEXT_PUBLIC_SITE_URL = https://botflow-ia.fr
NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
NEXT_PUBLIC_GSC_VERIFICATION = <token GSC>
```

(GA_ID et GSC_VERIFICATION récupérés aux étapes 5 et 6, puis redeploy)

## 5. Google Analytics 4

1. https://analytics.google.com → Créer un compte
2. Propriété : Botflow / FR / EUR
3. Flux de données : Web → `https://botflow-ia.fr`
4. Copier l'**ID de mesure** `G-XXXXXXXXXX`
5. Coller dans Vercel env `NEXT_PUBLIC_GA_ID`
6. Redeploy Vercel

## 6. Google Search Console

1. https://search.google.com/search-console
2. Ajouter propriété → **Préfixe d'URL** → `https://botflow-ia.fr`
3. Méthode vérification : **Balise HTML**
4. Copier le `content="..."` du meta tag
5. Coller dans Vercel env `NEXT_PUBLIC_GSC_VERIFICATION`
6. Redeploy → cliquer **Vérifier** dans GSC

Soumettre sitemap : GSC → Sitemaps → ajouter `sitemap.xml`

## 7. Vérifications post-déploiement

- https://botflow-ia.fr/ → homepage v4
- https://botflow-ia.fr/sitemap.xml → 9 URLs
- https://botflow-ia.fr/robots.txt
- https://search.google.com/test/rich-results?url=https://botflow-ia.fr → JSON-LD valide
- https://pagespeed.web.dev/?url=https://botflow-ia.fr → score CWV
- https://botflow-ia.fr/mentions-legales (etc)

## 8. Indexation accélérée

GSC → Inspection URL → coller chaque page → "Demander indexation"
(1x homepage + 7x sous-pages = 8 requêtes manuelles)

Soumettre aussi à Bing : https://www.bing.com/webmasters
