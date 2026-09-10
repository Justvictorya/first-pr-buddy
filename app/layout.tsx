import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'First PR Buddy — AI Onboarding Copilot',
  description: 'Point it at any codebase. Get an architecture map, a guided tour, your first 3 tasks, and the glossary of gotchas — in seconds.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}