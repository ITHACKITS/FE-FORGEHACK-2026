# AGENTS.md: Standbai Web App

Read [`MEMORY.md`](MEMORY.md) first: it holds the language rule, context, conventions and the decision log. Tasks and acceptance criteria are in [`PRD.md`](PRD.md); setup is in [`SETUP.md`](SETUP.md).

Non-negotiables:
1. **English everywhere:** UI copy, alt text, ARIA labels, code, comments, docs, commit messages, explanations.
2. **The prototype is the design source of truth** (`docs/design/reference-prototype.html`). Port it; don't redesign it.
3. **One API.** Call only the backend through `VITE_API_BASE_URL`. Never put API keys in the frontend.
4. **Honest UI:** the AI badge on model output, the "Example data" badge on fallback data, ranges instead of single impact numbers, and the "not an official warning" disclaimer on results.
5. **Visible attribution** for every map tile and data source.
6. **Accessibility:** WCAG 2.2 AA, keyboard access, visible focus, `prefers-reduced-motion`, no horizontal scroll at 390 px.
7. **Verify before claiming.** `npm run build` and `npm run lint` must pass; check the page in a browser.
