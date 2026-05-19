#!/usr/bin/env node
/**
 * IndexNow notifier — pings Bing/Yandex/Seznam/Naver instantly when URLs change.
 *
 * Usage:
 *   node scripts/indexnow.mjs                   # pings all sitemap URLs
 *   node scripts/indexnow.mjs <url1> <url2>     # pings specific URLs
 *
 * Run automatically on Vercel deploy via:
 *   vercel.json: { "buildCommand": "next build && node scripts/indexnow.mjs" }
 */

const KEY = "ed9d7c95b3a6edcb78a73fc7fcffd2ba";
const HOST = "botflow-ia.fr";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map((m) => m[1]);
}

async function notifyIndexNow(urls) {
  if (urls.length === 0) {
    console.log("[indexnow] no URLs to submit");
    return;
  }
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };
  console.log(`[indexnow] submitting ${urls.length} URL(s) to ${INDEXNOW_ENDPOINT}`);
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`[indexnow] response ${res.status}: ${text || "(empty body — success)"}`);
  if (!res.ok && res.status !== 200 && res.status !== 202) {
    process.exitCode = 1;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const urls = argv.length > 0 ? argv : await fetchSitemapUrls();
  await notifyIndexNow(urls);
}

main().catch((err) => {
  console.error("[indexnow] error:", err.message);
  process.exitCode = 1;
});
