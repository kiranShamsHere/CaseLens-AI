# CaseLens AI

Evidence-led case workspace for legal-aid teams.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:3000`. Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to the backend origin; the frontend calls the documented `/api/...` routes on that origin. Leave it blank to use same-origin routes.

## Checks

```powershell
npm run typecheck
npm run lint
npm run build
```

## Data behavior

Cases, case details, documents, conflicts, missing information, review decisions, Ask AI, and audit history call their API routes when available. The adapter accepts list responses as a bare array, a named collection, or a `data` array. It does not combine live records with sample records. When an endpoint cannot be reached, pages identify their sample fallback; Ask AI reports the API error without inventing an answer.

The repository currently has no backend service or `src/lib/contracts.ts`. Review the request and response shapes in `src/components/api.ts` and the page adapters against the backend contract when that service is added. Sample records are illustrative only.

Theme preference is stored locally. Client document contents are not cached in browser storage.
