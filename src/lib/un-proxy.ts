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

// Arial includes Vietnamese glyphs locally; exclude icon fonts from the override.
const vietnameseFont = `<style>html[lang="vi"] body,html[lang="vi"] body :where(h1,h2,h3,h4,h5,h6,p,a,li,span,div,td,th,label,input,button,textarea,select):not([class*="fa-"]):not(.fa):not(.fas):not(.far):not(.fab):not([class*="icon"]){font-family:Arial,"DejaVu Sans",sans-serif!important}html[lang="vi"] body{line-height:1.5}.un-translation-notice{position:relative;z-index:2147483646;padding:10px 16px;background:#fff3cd;color:#493800;font:16px/1.5 Arial,sans-serif}</style>`;

export function fallbackHtml(html: string, path: string) {
  return rewriteEnglishHtml(html, sourcePath(path)).replace(/<body\b[^>]*>/i, '$&<div class="un-translation-notice" role="status" lang="vi">Bản dịch tiếng Việt đang tạm thời xử lý, hiển thị nội dung gốc tiếng Anh</div>' + vietnameseFont);
}

export function rewriteEnglishHtml(html: string, path: string) {
  const localized = absolutizeAssets(localizeEnglishLinks(html));
  return localized.replace(/<\/body>/i, `${languageSwitch(path, false)}</body>`);
}

async function translateBatch(texts: string[], signal: AbortSignal) {
  if (!texts.length) return texts;
  const marker = "\n__UN_TRANSLATION_SEGMENT__\n";
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "en", tl: "vi", dt: "t", q: texts.join(marker) }).toString();
  const response = await fetch(url, { signal, next: { revalidate: 604800 } });
  if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
  const payload = (await response.json()) as [Array<[string]>];
  const translated = payload[0].map(([part]) => part).join("");
  const segments = translated.split(/\s*__UN_TRANSLATION_SEGMENT__\s*/);
  if (segments.length !== texts.length) throw new Error("Translation segment mismatch");
  return segments;
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

  const batches: typeof candidates[] = [];
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]);
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
    batches.push(batch);
  }
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, batches.length) }, async () => {
    while (cursor < batches.length) {
      signal.throwIfAborted();
      const batch = batches[cursor++];
      const translated = await translateBatch(batch.map(({ text }) => text), signal);
      batch.forEach(({ index, leading, trailing }, offset) => {
        // Translation output is text, never trusted HTML.
        const escaped = translated[offset].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        parts[index] = `${leading}${escaped}${trailing}`;
      });
    }
  })).catch((error) => {
    controller.abort();
    throw error;
  });

  const localized = absolutizeAssets(localizeVietnameseLinks(parts.join("")));
  return localized
    .replace(/<html\b([^>]*)>/i, (_match, attrs: string) => `<html${attrs.replace(/\s+lang=["'][^"']*["']/i, "")} lang="vi">`)
    .replace(/<\/body>/i, `${vietnameseFont}${languageSwitch(path, true)}</body>`);
}

export async function proxyRequest(request: Request, path: string) {
  const upstreamUrl = new URL(sourcePath(path), UN_ORIGIN);
  upstreamUrl.search = new URL(request.url).search;
  const upstream = await fetch(upstreamUrl, {
    headers: { accept: request.headers.get("accept") ?? "*/*", "accept-language": "en" },
    redirect: "follow",
    signal: AbortSignal.timeout(6_000),
    next: { revalidate: 3600 },
  });
  const headers = new Headers(upstream.headers);
  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.delete("last-modified");
  headers.delete("set-cookie");
  headers.set("x-un-clone-source", upstreamUrl.toString());

  if (!(headers.get("content-type") ?? "").includes("text/html")) {
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
  }

  const html = await upstream.text();
  const vietnamese = path === "/vi" || path.startsWith("/vi/");
  let body: string;
  let fallback = false;
  try {
    body = vietnamese && upstream.ok ? await translateHtml(html, path) : rewriteEnglishHtml(html, path);
  } catch {
    fallback = true;
    body = fallbackHtml(html, path);
  }
  headers.set("content-language", vietnamese && !fallback && upstream.ok ? "vi" : "en");
  headers.set("x-un-translation", fallback ? "fallback" : vietnamese && upstream.ok ? "translated" : "original");
  // CDN caches complete pages; failed translations retry soon without poisoning the long cache.
  const ttl = fallback ? 30 : 3600;
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("vercel-cdn-cache-control", upstream.ok ? `public, s-maxage=${ttl}, stale-while-revalidate=${fallback ? 30 : 86400}` : "no-store");
  headers.set("cdn-cache-control", upstream.ok ? `public, s-maxage=${ttl}, stale-while-revalidate=${fallback ? 30 : 86400}` : "no-store");
  return new Response(request.method === "HEAD" ? null : body, { status: upstream.status, headers });
}
