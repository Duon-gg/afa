# LanguageSwitch specification

## Overview

- Target: `languageSwitch()` in `src/lib/un-proxy.ts`
- Interaction model: click-driven

## Computed styles

- position: fixed; right: 16px; bottom: 16px
- display: flex; gap: 8px; align-items: center
- padding: 10px 14px; border-radius: 4px
- background: white; text: `#333`; link: `#0065a2`
- shadow: `0 2px 14px #0004`; z-index: 2147483647
- font: 700 14px/1.2 Arial, sans-serif

## States and behavior

The active language has `aria-current="page"`, dark text, and an underline. English and Vietnamese links preserve the corresponding content path. The control remains fixed at all breakpoints.
