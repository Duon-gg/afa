# Behaviors

- Navigation: source Bootstrap dropdown behavior is preserved.
- Search: source form behavior and destination are preserved.
- Carousels: source Owl Carousel scripts and controls are preserved.
- Video/audio: source embeds and native media controls are preserved.
- Responsive: the source Bootstrap breakpoints remain active; the language switch stays fixed at bottom-right.
- Language switch: click-driven. English routes retain their canonical path. `/en/**` maps to `/vi/**`; independent same-host systems map under `/vi/_sites/**`.
- Vietnamese links: same-site content links stay in the translated route space. Official Arabic, Chinese, French, Russian, and Spanish selectors keep their canonical paths.
- Translation: server-side text-node translation preserves markup, whitespace, scripts, styles, SVG, and layout.

Known external behavior: the UN Pulse WebSocket rejects localhost origins, so its live feed may not update locally. Static content remains visible.
