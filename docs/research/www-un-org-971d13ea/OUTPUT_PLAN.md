# UN bilingual clone output plan

## Confirmed boundary

- Source host: `https://www.un.org`
- Languages: English source content and a Vietnamese translation
- External hosts: preserve their original URLs
- Inventory source: `https://www.un.org/en/site-index`, followed by same-host discovery
- Exclusions: robots-disallowed paths, search/auth/admin endpoints, query duplicates, and binary documents as page routes

The host has no XML sitemap. Completion is measured against the committed manifest and any canonical same-host pages discovered while crawling it.

## Namespaces

- Site key: `www-un-org-971d13ea`
- English source home key: `en-7a4ba3ba`
- Research: `docs/research/www-un-org-971d13ea/`
- References: `docs/design-references/www-un-org-971d13ea/`
- Components: `src/components/sites/www-un-org-971d13ea/`
- Assets: `public/sites/www-un-org-971d13ea/`

## Routes

- `/` redirects to `/en`
- `/en/**` preserves canonical English paths
- `/vi/**` maps to the equivalent English source path and renders reviewed Vietnamese content
- Same-host systems outside `/en` keep their canonical English path and receive a Vietnamese route under `/vi/_sites/<prefix>/**` to avoid collisions

## Build order

1. Inventory and classify URL/template families.
2. Extract the shared UN shell, assets, behavior, and responsive rules.
3. Build the `/en` Drupal template families and English content.
4. Add Vietnamese content and the language switcher.
5. Add independent renderers for same-host systems outside `/en`.
6. Verify every manifest URL, interactions, desktop/mobile screenshots, build, and links.
7. Initialize Git, create a private GitHub repository, and push without deploying.
