import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/un-proxy.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { capitalizeVietnamese, rewriteStylesheet, rewriteEnglishHtml, translateHtml, proxyRequest, sourcePath, vietnamesePath } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const html = '<html lang="en"><head><title>Human Rights | UN</title></head><body><p>Hello world</p></body></html>';
assert.match(rewriteEnglishHtml(html, '/en/test'), /<title>Human Rights \| UN<\/title>/);
assert.equal(sourcePath('/vi/_sites/sg/en'), '/sg/en');
assert.equal(vietnamesePath('/en/test'), '/vi/test');
const iconHtml = '<html><head><link rel="stylesheet" href="https://www.un.org/sites/theme/style.css?v=1"></head><body><i class="fa fa-search"></i></body></html>';
const rewrittenIcons = rewriteEnglishHtml(iconHtml, '/en');
assert.match(rewrittenIcons, /href="\/sites\/theme\/style.css\?v=1"/);
assert.doesNotMatch(rewrittenIcons, /cdn\.jsdelivr\.net/);
// Drupal loads its Font Awesome CSS through inline imports, not link tags.
const inlineStyles = rewriteEnglishHtml('<html><head><style>@import url("https://www.un.org/sites/theme/fontawesome/css/all.css"); @import "https://www.un.org/sites/theme/fontawesome/css/v4-shims.css";</style></head><body><form id="search-block-form"><button><i class="fa fa-search" aria-hidden="true"></i></button></form><ul id="main-menu"><li class="menu-48684 top-level"><a href="/en/live/daily-pulse">The UN Pulse</a></li></ul></body></html>', '/en');
assert.match(inlineStyles, /@import url\("\/sites\/theme\/fontawesome\/css\/all.css"\)/);
assert.match(inlineStyles, /@import "\/sites\/theme\/fontawesome\/css\/v4-shims.css"/);
assert.match(inlineStyles, /id="un-control-icons"/);
assert.match(inlineStyles, /#search-block-form button \.fa-search::before/);
assert.match(inlineStyles, /#main-menu li\.menu-48684\.top-level > a::before/);
assert.match(inlineStyles, /data:image\/svg\+xml/);
assert.match(inlineStyles, /mask:var\(--un-control-icon\)/);
assert.match(inlineStyles, /<button><i class="fa fa-search" aria-hidden="true"><\/i><\/button>/);
const css = rewriteStylesheet('@font-face{src:url("../fonts/icons.woff2?v=1#glyph")} .x{background:url(data:image/png;base64,abc)} @import "other.css"; .y{src:url(https://cdn.example/font.woff2)}', 'https://www.un.org/sites/theme/css/main.css');
assert.match(css, /url\("\/sites\/theme\/fonts\/icons.woff2\?v=1#glyph"\)/);
assert.match(css, /url\(data:image\/png;base64,abc\)/);
assert.match(css, /@import "\/sites\/theme\/css\/other.css"/);
assert.match(css, /https:\/\/cdn.example\/font.woff2/);

assert.equal(capitalizeVietnamese('c\u00e1c m\u1ee5c ti\u00eau', true), 'C\u00e1c m\u1ee5c ti\u00eau');
assert.equal(capitalizeVietnamese('tr\u00ean m\u1ed9t h\u00e0nh tinh', false), 'tr\u00ean m\u1ed9t h\u00e0nh tinh');
assert.equal(capitalizeVietnamese('\u201c\u0111\u00e2y. c\u00e2u ti\u1ebfp', true), '\u201c\u0110\u00e2y. C\u00e2u ti\u1ebfp');
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response('@font-face{src:url(../fonts/icons.woff2)}', { headers: { 'content-type': 'text/css' } });
  const stylesheetResponse = await proxyRequest(new Request('https://example.com/sites/css/main.css'), '/sites/css/main.css');
  assert.equal(stylesheetResponse.headers.get('content-type'), 'text/css; charset=utf-8');
  assert.match(await stylesheetResponse.text(), /url\(\/sites\/fonts\/icons.woff2\)/);

  const regressionHtml = '<html lang="en"><body><a class="navbar-brand" title="Peace, dignity and equality <BR>on a healthy planet">Peace, dignity and equality <BR>on a healthy planet</a><p><a href="/en/goals">The goals</a> are shared. <em>Everyone matters.</em></p><script>const label="Do not translate";</script></body></html>';
  const translations = { 'Peace, dignity and equality': 'h\u00f2a b\u00ecnh', 'on a healthy planet': 'tr\u00ean h\u00e0nh tinh', 'The goals': 'c\u00e1c m\u1ee5c ti\u00eau', 'are shared.': '\u0111\u01b0\u1ee3c chia s\u1ebb.', 'Everyone matters.': 'm\u1ecdi ng\u01b0\u1eddi.' };
  globalThis.fetch = async url => {
    const q = new URL(url).searchParams.get('q');
    assert.ok(!q.includes('title=') && !q.includes('Do not translate'));
    const result = q.split('\n__UN_TRANSLATION_SEGMENT__\n').map(text => translations[text] ?? text).join('\n__UN_TRANSLATION_SEGMENT__\n');
    return new Response(JSON.stringify([[[result]]]));
  };
  const fixed = await translateHtml(regressionHtml, '/vi');
  assert.ok(fixed.includes('title="Peace, dignity and equality <BR>on a healthy planet"'));
  assert.ok(fixed.includes('>H\u00f2a b\u00ecnh <BR>tr\u00ean h\u00e0nh tinh</a>'));
  assert.ok(fixed.includes('>C\u00e1c m\u1ee5c ti\u00eau</a> \u0111\u01b0\u1ee3c chia s\u1ebb. <em>M\u1ecdi ng\u01b0\u1eddi.</em>'));
  assert.ok(fixed.includes('<script>const label="Do not translate";</script>'));
  globalThis.fetch = async () => new Response(JSON.stringify([[['Quyền con người\n__UN_TRANSLATION_SEGMENT__\nXin chào']]]));
  const translated = await translateHtml(html, '/vi/test');
  assert.match(translated, /<title>Quyền con người<\/title>/);
  assert.match(translated, /lang="vi"/);
  assert.match(translated, /font-family:Arial/);
  for (const failure of ['429', 'timeout', 'segments']) {
    globalThis.fetch = async url => {
      if (String(url).startsWith('https://www.un.org')) return new Response(html, { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' } });
      if (failure === 'timeout') throw new DOMException('Timed out', 'TimeoutError');
      return failure === '429' ? new Response('', { status: 429 }) : new Response(JSON.stringify([[['bad segments']]]));
    };
    const response = await proxyRequest(new Request('https://example.com/vi/test'), '/vi/test');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-language'), 'en');
    assert.equal(response.headers.get('x-un-translation'), 'fallback');
    assert.equal(response.headers.get('content-encoding'), null);
    assert.match(response.headers.get('vercel-cdn-cache-control'), /s-maxage=30,/);
    const body = await response.text();
    assert.match(body, /<title>Human Rights \| UN<\/title>/);
    assert.match(body, /Bản dịch tiếng Việt đang tạm thời xử lý/);
  }
} finally { globalThis.fetch = originalFetch; }
console.log('Proxy title, translation, font, cache and failure checks passed.');
