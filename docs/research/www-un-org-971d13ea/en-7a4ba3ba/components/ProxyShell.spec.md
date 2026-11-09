# ProxyShell specification

## Overview

- Target: `src/app/[...path]/route.ts` and `src/lib/un-proxy.ts`
- Screenshot: `docs/design-references/www-un-org-971d13ea/en-7a4ba3ba/clone-home-desktop.png`
- Interaction model: source-defined click, hover, time, and media behavior

## DOM and styles

The upstream DOM, computed styles, asset references, metadata, and scripts are returned without structural reconstruction. This is required because the confirmed scope contains 45 independent path systems and 504 officially indexed URLs. Same-host page links are localized; external hosts remain unchanged.

## States and behaviors

- English: canonical source path and text.
- Vietnamese: equivalent source path, translated text nodes, `lang="vi"`, localized same-host links.
- Binary/static response: streamed without HTML transformation.
- Source errors: retain the upstream status.

## Responsive behavior

Source media queries and Bootstrap breakpoints apply unchanged at desktop, tablet, and mobile widths.
