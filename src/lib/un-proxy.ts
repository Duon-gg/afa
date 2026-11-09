const UN_ORIGIN = "https://www.un.org";
const ASSET_PREFIXES = ["/sites/", "/themes/", "/modules/", "/misc/", "/profiles/", "/scripts/"];
const BINARY_EXTENSION = /\.(?:avif|css|csv|docx?|eot|gif|ico|jpe?g|js|json|map|mp3|mp4|pdf|png|pptx?|svg|ttf|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i;

export function sourcePath(path: string) {
  if (path === "/vi" || path === "/vi/") return "/en";
  if (path.startsWith("/vi/_sites/")) return `/${path.slice("/vi/_sites/".length)}`;
  if (path.startsWith("/vi/")) return `/en/${path.slice(4)}`;
  return path;
}

export function vietnamesePath(path: string) {
  if (path === "/en" || path === "/en/") return "/vi";
  if (path.startsWith("/en/")) return `/vi/${path.slice(4)}`;
  return `/vi/_sites${path.startsWith("/") ? path : `/${path}`}`;
}

function isPagePath(path: string) {
  return !ASSET_PREFIXES.some((prefix) => path.startsWith(prefix)) && !BINARY_EXTENSION.test(path);
}

function localizeVietnameseLinks(html: string) {
  return html.replace(/(<a\b[^>]*?\bhref=["'])(https:\/\/www\.un\.org)?(\/[^"'#?]*)([^"']*)(["'])/gi, (match, before, _origin, path, suffix, quote) =>
    isPagePath(path) && !/^\/(?:ar|zh|fr|ru|es)(?:\/|$)/.test(path) ? `${before}${vietnamesePath(path)}${suffix}${quote}` : match,
  );
}

function localizeEnglishLinks(html: string) {
  return html.replace(/(<a\b[^>]*?\bhref=["'])https:\/\/www\.un\.org(\/[^"']*)(["'])/gi, "$1$2$3");
}

function absolutizeAssets(html: string) {
  return html.replace(/((?:src|href)=["'])(\/(?:sites|themes|modules|misc|profiles|scripts)\/)/gi, `$1${UN_ORIGIN}$2`);
}

function languageSwitch(path: string, vietnamese: boolean) {
  const english = sourcePath(path);
  const vietnameseUrl = vietnamesePath(english);
  return `<nav class="un-clone-language-switch" aria-label="Language"><a href="${english}"${vietnamese ? "" : ' aria-current="page"'}>English</a><span>·</span><a href="${vietnameseUrl}"${vietnamese ? ' aria-current="page"' : ""}>Tiếng Việt</a></nav><style>@font-face{font-family:"Font Awesome 5 Free";font-style:normal;font-weight:900;font-display:block;src:url(https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/webfonts/fa-solid-900.woff2) format("woff2")}@font-face{font-family:"Font Awesome 5 Free";font-style:normal;font-weight:400;font-display:block;src:url(https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/webfonts/fa-regular-400.woff2) format("woff2")}@font-face{font-family:"Font Awesome 5 Brands";font-style:normal;font-weight:400;font-display:block;src:url(https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/webfonts/fa-brands-400.woff2) format("woff2")}.un-clone-language-switch{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:10px 14px;border-radius:4px;background:#fff;color:#333;box-shadow:0 2px 14px #0004;font:700 14px/1.2 Arial,sans-serif}.un-clone-language-switch a{color:#0065a2;text-decoration:none}.un-clone-language-switch a[aria-current=page]{color:#333;text-decoration:underline}</style>`;
}

export function rewriteEnglishHtml(html: string, path: string) {
  const localized = absolutizeAssets(localizeEnglishLinks(html));
  return localized.replace(/<\/body>/i, `${languageSwitch(path, false)}</body>`);
}

async function translateBatch(texts: string[]) {
  if (!texts.length) return texts;
  const marker = "\n__UN_TRANSLATION_SEGMENT__\n";
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "en", tl: "vi", dt: "t", q: texts.join(marker) }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
  const payload = (await response.json()) as [Array<[string]>];
  const translated = payload[0].map(([part]) => part).join("");
  const segments = translated.split(/\s*__UN_TRANSLATION_SEGMENT__\s*/);
  return segments.length === texts.length ? segments : texts;
}

export async function translateHtml(html: string, path: string) {
  const parts = html.split(/(<(?:script|style|noscript|svg)\b[\s\S]*?<\/(?:script|style|noscript|svg)>|<[^>]+>)/gi);
  const candidates = parts
    .map((part, index) => {
      const leading = part.match(/^\s*/)?.[0] ?? "";
      const trailing = part.match(/\s*$/)?.[0] ?? "";
      return { index, leading, trailing, text: part.slice(leading.length, part.length - trailing.length) };
    })
    .filter(({ text }) => !text.startsWith("<") && /[A-Za-z]{2}/.test(text) && text.trim().length > 1);

  for (let start = 0; start < candidates.length; ) {
    const batch = [] as typeof candidates;
    let length = 0;
    while (start < candidates.length && length + candidates[start].text.length < 2800) {
      batch.push(candidates[start]);
      length += candidates[start].text.length;
      start += 1;
    }
    if (!batch.length) {
      batch.push(candidates[start]);
      start += 1;
    }
    const translated = await translateBatch(batch.map(({ text }) => text));
    batch.forEach(({ index, leading, trailing }, offset) => (parts[index] = `${leading}${translated[offset]}${trailing}`));
  }

  const localized = absolutizeAssets(localizeVietnameseLinks(parts.join("")));
  return localized
    .replace(/<html(\s[^>]*)?\blang=["'][^"']*["']/i, '<html$1 lang="vi"')
    .replace(/<\/body>/i, `${languageSwitch(path, true)}</body>`);
}

export async function proxyRequest(request: Request, path: string) {
  const upstreamUrl = new URL(sourcePath(path), UN_ORIGIN);
  upstreamUrl.search = new URL(request.url).search;
  const upstream = await fetch(upstreamUrl, {
    headers: { accept: request.headers.get("accept") ?? "*/*", "accept-language": "en" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  const headers = new Headers(upstream.headers);
  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("content-length");
  headers.delete("set-cookie");
  headers.set("x-un-clone-source", upstreamUrl.toString());

  if (!(headers.get("content-type") ?? "").includes("text/html")) {
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
  }

  const html = await upstream.text();
  const body = path.startsWith("/vi") ? await translateHtml(html, path) : rewriteEnglishHtml(html, path);
  headers.set("content-language", path.startsWith("/vi") ? "vi" : "en");
  return new Response(request.method === "HEAD" ? null : body, { status: upstream.status, headers });
}
