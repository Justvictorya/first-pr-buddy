import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'First PR Buddy — AI Onboarding Copilot',
  description:
    'Point it at any codebase. Get an architecture map, a guided tour, your first 3 real GitHub issues, and the glossary of gotchas — in seconds. Free and open.',
  keywords: [
    'onboarding',
    'developer',
    'codebase',
    'first PR',
    'AI',
    'open source',
    'hackathon',
  ],
  openGraph: {
    title: 'First PR Buddy',
    description: 'Your first PR, hours early. Point it at any codebase and get an onboarding package in seconds.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-sm font-bold text-white">
                🧭
              </span>
              <span className="text-lg font-bold tracking-tight">
                First PR <span className="text-gradient">Buddy</span>
              </span>
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a
                href="https://github.com/Justvictorya/first-pr-buddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition hover:text-slate-100"
              >
                GitHub
              </a>
              <a
                href="https://ollama.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30"
              >
                ⚡ Powered by Ollama
              </a>
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t border-slate-800/60 px-6 py-8 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-5xl">
            <p className="mb-1">
              First PR Buddy — your first PR, hours early.
            </p>
            <p>
              Built with Next.js · Tailwind · Groq AI · GitHub REST API.{' '}
              <a
                href="https://github.com/Justvictorya/first-pr-buddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-300"
              >
                View source
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}