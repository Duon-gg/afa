# UN English–Vietnamese mirror

A Next.js mirror of the content published on `www.un.org`, with canonical English routes and server-translated Vietnamese routes. Links to other domains remain unchanged.

## Routes

- `/` redirects to `/en`.
- Existing `www.un.org` paths are mirrored at the same path.
- `/vi/**` translates the corresponding `/en/**` page.
- `/vi/_sites/**` translates independent same-host systems outside `/en`.

The floating `English · Tiếng Việt` control switches between equivalent routes.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Production verification:

```bash
npm run lint
npm run build
node scripts/check-un-proxy.mjs
```

## Inventory and design evidence

The official English site index currently yields 504 unique same-host URLs across 45 prefix groups. The committed manifest, research notes, component specifications, and desktop/mobile reference images are under `docs/`.

## Architecture and limits

The confirmed scope contains many independently maintained systems on one host and has no XML sitemap. The app therefore uses a controlled live mirror: it streams source assets and HTML, rewrites same-host navigation, and translates visible text nodes for Vietnamese while preserving markup and behavior.

Running the mirror requires network access to `www.un.org` and Google Translate's public web endpoint. Translation is automatic and has not received editorial review. Some third-party live embeds can reject localhost origins; the UN Pulse WebSocket is the observed example. No deployment configuration is included.

This project is an independent technical reproduction and is not an official United Nations website.

## Translation resilience and verification

English pages retain their source title. Vietnamese pages translate the title along with text and use an Arial / DejaVu Sans stack supporting Vietnamese accents, while preserving icon fonts. If translation fails, the complete original page is returned with a Vietnamese notice and `Content-Language: en`.

Successful HTML responses use a one-hour shared CDN cache with one-day stale-while-revalidate. Fallback pages use a 30-second cache so translation can recover quickly. Upstream HTML is cached for one hour by Next.js; translation batch responses are cached for seven days. Translation runs at most three batches concurrently with an eight-second total translation deadline. Cold requests and upstream outages can still fail; caching does not guarantee elimination of all 429/504 responses.

```bash
npm test
npm run verify:urls -- --base-url https://YOUR-DEPLOYMENT.vercel.app
```

The verifier checks all 504 manifest entries in both languages (1,008 requests) with four workers by default. It writes `verify-manifest-report.json`, reports HTTP status counts, success rates, translation fallbacks, redirect chains and network errors, and exits nonzero for failed requests. Use `--concurrency 2`, `--timeout 25000`, `--limit 10`, or `--output report.json` as needed. Run only against a deployment you intend to verify. A fallback HTTP 200 counts as available and is separately reported as a translation fallback.

Manifest paths under `/en` map to `/vi`; other source paths retain their original English-side route and map to `/vi/_sites/...`. Prefixing every independent source URL with `/en` would request a different upstream page. Redirects leaving the deployment or switching between English and Vietnamese routes are flagged; all other redirect chains remain visible in the report for review.
