# First PR Buddy

**IBM Bob 2.0 Hackathon — AI Onboarding Copilot**

## The Problem

New developers joining a codebase face a wall of unfamiliar code. They spend days figuring out architecture, conventions, and where to start. Every team pays for this ramp time.

## The Solution

First PR Buddy is an AI onboarding copilot that:
1. **Takes any git URL** — point it at a repo
2. **Clones and analyzes** — Bob 2.0 reads the codebase with subagents per module
3. **Generates an onboarding package**:
   - Architecture map (visual overview of the codebase structure)
   - Guided repo tour (what each directory/module does)
   - First 3 highest-value tasks for a new developer
   - Glossary of patterns, conventions, and gotchas

## Why It Wins

- **Application of Technology** — Bob 2.0's full-repo context, document understanding, parallel subagents
- **Business Value** — Developers reach first commit days faster
- **Originality** — Personalized "here's your first assignment" story is fresh
- **Demo-ability** — Point at stranger's repo → onboarding package appears in seconds

## Tech Stack

- **Frontend**: Next.js + React + Tailwind
- **Backend**: API routes (cloning, Bob analysis, report generation)
- **AI**: IBM Bob 2.0 (subagents, agent mode, document understanding)
- **Deploy**: Vercel (free tier)

## 48-Hour Timeline

**Sept 25**: Scaffold app, clone + analyze pipeline
**Sept 26**: Polish report generator, record demo, write slides
**Sept 27**: Deploy, add screenshots, submit before 4:00 PM WAT

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/first-pr-buddy.git
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
# Bob 2.0 API (provided at hackathon kickoff)
BOB_API_KEY=your_key_here

# Optional: GitHub token for private repos
GITHUB_TOKEN=your_token_here
```

## Project Structure

```
first-pr-buddy/
├── app/
│   ├── page.tsx           # Landing page with git URL input
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── GitUrlInput.tsx    # URL input + submit
│   ├── ArchitectureMap.tsx # Visual codebase overview
│   ├── RepoTour.tsx       # Guided tour component
│   ├── FirstTasks.tsx     # First 3 tasks display
│   └── Glossary.tsx       # Patterns & gotchas
├── lib/
│   ├── clone.ts           # Git clone logic
│   ├── analyze.ts         # Bob 2.0 analysis pipeline
│   └── report.ts          # Report generation
├── public/
├── package.json
└── README.md
```

## Demo Story

1. User pastes `https://github.com/facebook/react`
2. App clones repo (2-3 seconds)
3. Bob analyzes with subagents per module (5-10 seconds)
4. Onboarding package renders:
   - Architecture map shows React's core modules
   - Tour explains reconciliation, fibers, hooks
   - First tasks: "Fix #123", "Add docs for X", "Refactor Y"
   - Glossary defines terms, warns about gotchas

## Judging Criteria

| Criteria | Weight | Our Angle |
|----------|--------|-----------|
| Application of Technology | 25% | Bob's subagents, parallel analysis, doc understanding |
| Presentation | 25% | Clean UI, compelling demo video |
| Business Value | 25% | Faster onboarding = money saved |
| Originality | 25% | Personalized first-task assignment, not just docs |

## Cost

~$0-5 (Bob free, Vercel free, no paid APIs)

---

**Submission**: lablab.ai + Discord #looking-for-team
**Deadline**: Sept 27, 4:00 PM WAT
