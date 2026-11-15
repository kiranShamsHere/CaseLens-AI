# Contributing to CaseLens

Thanks for helping make casework easier to check. CaseLens is an early prototype, so clear scope and careful handling of evidence matter as much as the interface.

## Before you start

- Check the existing pages and shared components before adding a new pattern.
- For a large change, open an issue or discussion first so the team can agree on the shape of the work.
- Keep sample data fictional. Never commit client files, personal information, API keys, tokens, or `.env.local`.
- Do not describe an unmeasured result as a proven improvement or an illustrative record as real case data.

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```bash
git clone https://github.com/ghulamebilal-dev/caselens-ai.git
cd caselens-ai
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The app can be explored with sample records without an API. To use a backend, create `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to the API origin. Never put a secret in a `NEXT_PUBLIC_` variable; Next.js exposes it to the browser.

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Working on a change

1. Start from an up-to-date `main` branch.
2. Create a focused branch, for example `feature/case-filters` or `fix/mobile-review-layout`.
3. Make one coherent change at a time. Reuse `src/components/ui.tsx` and the shared workspace shell when they fit.
4. Check the affected route at a narrow and wide viewport, in light and dark themes, and with sample/API-unavailable states where relevant.
5. Run the checks above and inspect `git diff` for accidental files or data.
6. Open a pull request with context, screenshots for visual changes, and any known limitation.

## Design and implementation conventions

- Keep the visual language calm and readable: warm neutrals, restrained gold accents, legible type, and soft borders.
- Preserve responsive behavior. Dense information should still have a clear reading order on a small screen.
- Keep focus states visible and controls keyboard-operable. Respect reduced-motion preferences.
- Label the source state accurately: sample, live, or unavailable. Do not silently blend demo and API data.
- For a high-impact finding, retain the source, location when available, and enough quoted context for a person to verify it.
- A missing match is not proof that something did not happen. Use language that invites follow-up.
- Do not make an AI answer look verified just because it is well formatted. Keep citations and review state visible.
- Keep API response handling aligned with the adapter and normalizers in `src/components/api.ts` and `src/components/demo-data.ts`. Update this README if routes or expected payloads change.
- Avoid adding dependencies for small interface needs when the existing stack already covers them.

## Pull request checklist

- [ ] The change solves one described problem and has a clear summary.
- [ ] Lint, typecheck, and production build pass.
- [ ] Relevant screens were checked on mobile and desktop.
- [ ] Light/dark theme and keyboard focus were considered for UI changes.
- [ ] Sample content is clearly illustrative; no real client data or secrets were added.
- [ ] Evidence and review states remain honest and traceable.
- [ ] Screenshots or a short recording are attached for visual changes.
- [ ] Documentation and API notes are updated when behavior or contracts change.

## Reporting a security or privacy concern

Do not include confidential client material in a public issue. Contact the repository maintainers privately with a concise description and steps to reproduce. This prototype is not approved for real client data; report accidental exposure promptly so maintainers can assess it.

## Questions

For product or implementation questions, open a GitHub issue with the route or component involved, what you expected, what happened, and the smallest reproducible example you can share safely.
