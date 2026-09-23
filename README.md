# First PR Buddy

**AI Onboarding Copilot**

## The Problem

New developers joining a codebase face a wall of unfamiliar code. They spend days figuring out architecture, conventions, and where to start. Every team pays for this ramp time.

## The Solution

First PR Buddy is an AI onboarding copilot that:
1. **Takes any git URL** — point it at a repo
2. **Clones and analyzes** — samples source files, detects manifests, builds a module map
3. **Generates an onboarding package**:
   - Architecture map (visual overview of the codebase structure)
   - Guided repo tour (what each directory/module does)
   - First 3 highest-value tasks for a new developer
   - Glossary of patterns, conventions, and gotchas
   - **Grounded chat** — ask questions answered against real source code

## Why It Wins

- **Application of Technology** — Real LLM chat grounded in sampled source code, parallel manifest fetches, in-memory caching
- **Business Value** — Developers reach first commit days faster
- **Originality** — Personalized "here's your first assignment" story is fresh
- **Demo-ability** — Point at stranger's repo → onboarding package appears in seconds
- **Offline-first** — Works with zero API keys via deterministic heuristics; add OpenAI/Anthropic for real AI answers

## Tech Stack

- **Frontend**: Next.js + React + Tailwind
- **Backend**: API routes (cloning, scanning, report generation, chat)
- **AI**: OpenAI / Anthropic (optional), deterministic heuristics fallback, IBM Bob 2.0 (planned)
- **Deploy**: Vercel (free tier)

## Getting Started

```bash
# Clone
git clone https://github.com/Justvictorya/first-pr-buddy.git
cd first-pr-buddy

# Install
npm install

# Run dev
npm run dev

# Open
http://localhost:3000
```

## Environment Variables

```env
# Optional: GitHub token for private repos / higher rate limits
GITHUB_TOKEN=your_token_here

# Optional: enable real LLM chat (falls back to heuristics otherwise)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

## Project Structure

```
first-pr-buddy/
├── app/
│   ├── page.tsx           # Landing page with git URL input
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts   # Clone → scan → report pipeline
│       └── chat/route.ts      # LLM-backed chat with heuristic fallback
├── components/
│   ├── ArchitectureMap.tsx    # Visual codebase overview
│   ├── RepoTour.tsx           # Guided tour component
│   ├── FirstTasks.tsx         # First 3 tasks display
│   ├── Glossary.tsx           # Patterns & gotchas
│   ├── GettingStarted.tsx     # Install/run commands
│   ├── ReportChat.tsx         # Chat UI
│   └── ProgressTracker.tsx    # Onboarding checklist
├── lib/
│   ├── clone.ts               # GitHub API clone + lazy file fetch
│   ├── scanner.ts             # File tree → language, manifests, modules, source samples
│   ├── report.ts              # Deterministic onboarding report generator
│   ├── bob.ts                 # IBM Bob 2.0 integration (env-gated)
│   ├── chat.ts                # LLM chat (OpenAI → Anthropic → heuristics)
│   ├── heuristics.ts          # Keyword-based chat fallback
│   ├── cache.ts               # In-memory analysis cache
│   └── types.ts               # Shared TypeScript interfaces
└── package.json
```

## Demo Story

1. User pastes `https://github.com/facebook/react`
2. App clones repo (2-3 seconds)
3. Scanner samples key source files + manifests (5-10 seconds)
4. Onboarding package renders:
   - Architecture map shows React's core modules
   - Tour explains reconciliation, fibers, hooks
   - First tasks: "Add a test for X", "Document Y", "Commit lockfile"
   - Glossary defines terms, warns about gotchas
   - Chat: "how does reconciliation work?" → grounded answer citing real files

## Cost

~$0-5 (Vercel free, no paid APIs required; LLM keys optional)
