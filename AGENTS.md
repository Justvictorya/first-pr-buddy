# First PR Buddy

## Commands
- Dev: `npm run dev`
- Build: `npm run build` (also runs typecheck)
- Lint: `npm run lint`

## Architecture
- `app/page.tsx` — landing page + URL input + report render (client component)
- `app/api/analyze/route.ts` — POST: git URL → clone → scan → optionally Bob → report
- `lib/clone.ts` — GitHub API / isomorphic-git clone, `getFile`, `listFiles`
- `lib/scanner.ts` — produces `ScanResult` (language, manifests, modules)
- `lib/bob.ts` — IBM Bob 2.0 integration seam (env-gated, mock for now)
- `lib/report.ts` — deterministic `OnboardingReport` generator (works with zero APIs)
- `components/` — ArchitectureMap, RepoTour, FirstTasks, Glossary

## Data flow
1. POST `/api/analyze` with `{ repoUrl }`
2. `cloneRepo` → fetch github tree or local shallow clone
3. `scanRepo` → modules, manifests, language
4. `analyzeWithBob` (only if `BOB_ENABLED=true`) → per-module structured analysis
5. `generateReport` → `OnboardingReport` JSON
6. UI renders the four sections

## Important rules
- NEVER commit .env or any API keys. Only `.env.example` goes in the repo.
- No comments in code unless a TODO for the kickoff integration point.
- Submit before Sept 27 4:00 PM WAT.