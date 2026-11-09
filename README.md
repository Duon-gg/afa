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
