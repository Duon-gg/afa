import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/un-proxy.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { rewriteEnglishHtml, translateHtml, proxyRequest, sourcePath, vietnamesePath } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const html = '<html lang="en"><head><title>Human Rights | UN</title></head><body><p>Hello world</p></body></html>';
assert.match(rewriteEnglishHtml(html, '/en/test'), /<title>Human Rights \| UN<\/title>/);
assert.equal(sourcePath('/vi/_sites/sg/en'), '/sg/en');
assert.equal(vietnamesePath('/en/test'), '/vi/test');
const originalFetch = globalThis.fetch;
try {
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
