import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const base = option('--base-url', process.env.VERIFY_BASE_URL);
if (!base) throw new Error('Use --base-url https://your-domain.vercel.app');
const origin = new URL(base).origin;
const concurrency = Number(option('--concurrency', '4'));
const timeout = Number(option('--timeout', '25000'));
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32 || !Number.isFinite(timeout) || timeout < 1) throw new Error('Invalid concurrency (1–32) or timeout');
const manifest = JSON.parse(await readFile(new URL('../docs/research/www-un-org-971d13ea/site-index-manifest.json', import.meta.url), 'utf8'));
const sources = [...new Set(manifest.groups.flatMap(group => group.urls))];
if (sources.length !== manifest.total) throw new Error('Manifest total mismatch');
const viPath = path => path === '/en' || path === '/en/' ? '/vi' : path.startsWith('/en/') ? `/vi/${path.slice(4)}` : `/vi/_sites${path}`;
const jobs = sources.flatMap(source => {
  const path = new URL(source).pathname;
  return [{ source, language: 'en', path }, { source, language: 'vi', path: viPath(path) }];
});
const limit = Number(option('--limit', String(jobs.length)));
if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid limit');
const queue = jobs.slice(0, limit);
let cursor = 0;
const results = [];
await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
  while (cursor < queue.length) {
    const job = queue[cursor++];
    const started = Date.now();
    const redirects = [];
    let url = new URL(job.path, origin);
    try {
      const signal = AbortSignal.timeout(timeout);
      let response;
      for (;;) {
        response = await fetch(url, { redirect: 'manual', signal });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('Redirect without Location');
        const next = new URL(location, url);
        redirects.push({ from: url.href, to: next.href, status: response.status });
        if (next.origin !== origin || (job.language === 'vi' && !/^\/vi(?:\/|$)/.test(next.pathname)) || (job.language === 'en' && /^\/vi(?:\/|$)/.test(next.pathname))) throw new Error('Wrong redirect origin or language');
        if (redirects.length > 5) throw new Error('Redirect loop or excessive redirects');
        url = next;
      }
      const translation = response.headers.get('x-un-translation');
      await response.body?.cancel();
      results.push({ ...job, url: url.href, status: response.status, ok: response.status === 200, translation, redirects, ms: Date.now() - started });
    } catch (error) {
      results.push({ ...job, url: url.href, ok: false, error: error.message, redirects, ms: Date.now() - started });
    }
    if (results.length % 50 === 0) console.log(`${results.length}/${queue.length} checked`);
  }
}));
const summary = Object.fromEntries(['en', 'vi'].map(language => {
  const rows = results.filter(row => row.language === language);
  const success = rows.filter(row => row.ok).length;
  return [language, { total: rows.length, success, successRate: rows.length ? `${(100 * success / rows.length).toFixed(2)}%` : 'N/A', fallback: rows.filter(row => row.translation === 'fallback').length, statuses: rows.reduce((counts, row) => { const key = row.status ?? 'network/redirect-error'; counts[key] = (counts[key] ?? 0) + 1; return counts; }, {}) }];
}));
const report = { checkedAt: new Date().toISOString(), origin, manifestTotal: sources.length, summary, results };
const output = option('--output', 'verify-manifest-report.json');
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Report: ${output}`);
for (const row of results.filter(row => !row.ok)) console.error(`${row.language} ${row.path}: ${row.status ?? row.error}`);
if (results.some(row => !row.ok)) process.exitCode = 1;
