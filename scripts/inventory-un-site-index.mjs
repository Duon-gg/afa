import { writeFile } from "node:fs/promises";

const source = "https://www.un.org/en/site-index";
const response = await fetch(source, { headers: { "user-agent": "UN bilingual clone inventory/1.0" } });

if (!response.ok) throw new Error(`Failed to fetch ${source}: ${response.status}`);

const html = await response.text();
// shortcut: the official index uses ordinary href attributes; use an HTML parser if its markup becomes malformed.
const urls = [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
  .map(([, href]) => new URL(href, source))
  .filter((url) => url.hostname === "www.un.org" && ["http:", "https:"].includes(url.protocol))
  .map((url) => {
    url.protocol = "https:";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "") || "https://www.un.org";
  });

const uniqueUrls = [...new Set(urls)].sort();
const groups = Object.entries(
  uniqueUrls.reduce((result, url) => {
    const path = new URL(url).pathname;
    const key = path.startsWith("/en/") || path === "/en" ? "/en" : `/${path.split("/").filter(Boolean)[0] ?? ""}`;
    (result[key] ??= []).push(url);
    return result;
  }, {}),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([prefix, entries]) => ({ prefix, count: entries.length, urls: entries }));

const manifest = {
  generatedAt: new Date().toISOString(),
  source,
  boundary: "Unique, query-free www.un.org links published in the official English site index",
  total: uniqueUrls.length,
  groups,
};

await writeFile("docs/research/www-un-org-971d13ea/site-index-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.total} URLs in ${groups.length} prefix groups.`);
