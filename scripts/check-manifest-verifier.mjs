import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
const originalFetch = globalThis.fetch;
const originalArgs = process.argv;
const output = 'verify-manifest-mock-report.json';
try {
  globalThis.fetch = async value => {
    const url = new URL(value);
    if (url.pathname === '/') return new Response(null, { status: 307, headers: { location: '/en' } });
    return new Response('<title>Test</title>', { headers: { 'content-type': 'text/html', 'x-un-translation': url.pathname.startsWith('/vi') ? 'translated' : 'original' } });
  };
  process.argv = ['node', 'verify', '--base-url', 'https://mock.example', '--output', output];
  await import('./verify-manifest-urls.mjs');
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(report.results.length, 1008);
  assert.equal(report.summary.en.success, 504);
  assert.equal(report.summary.vi.success, 504);
  console.log('All 1008 simulated manifest requests passed.');
} finally {
  globalThis.fetch = originalFetch;
  process.argv = originalArgs;
  await unlink(output).catch(() => {});
}
