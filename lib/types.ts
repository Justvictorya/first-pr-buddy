export interface RepoStats {
  name: string
  fullName: string
  defaultBranch: string
  language: string
  topLanguages: { name: string; percentage: number }[]
  fileCount: number
  commitCount: number
  license?: string
  description?: string
}

export interface ModuleInfo {
  path: string
  purpose: string
  entryPoints: string[]
  dependencies: string[]
  files: string[]
  complexity: 'low' | 'medium' | 'high'
  talkTo: string[]
}

export interface RepoNode {
  id: string
  name: string
  path: string
  type: 'dir' | 'file'
  purpose?: string
  children?: RepoNode[]
}

export interface Task {
  id: string
  title: string
  description: string
  files: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  whyItMatters: string
}

export interface GlossaryTerm {
  term: string
  definition: string
  example?: string
}

export interface Gotcha {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface SetupInfo {
  packageManager: string
  installCommand: string
  scripts: { name: string; command: string }[]
  envVars: string[]
  hasDockerfile: boolean
  hasMakefile: boolean
  dockerCommands?: string[]
}

export interface OnboardingReport {
  repo: RepoStats
  architectureMap: RepoNode[]
  tour: {
    overview: string
    modules: ModuleInfo[]
    recommendedOrder: string[]
  }
  firstTasks: Task[]
  glossary: {
    patterns: GlossaryTerm[]
    gotchas: Gotcha[]
  }
  setup: SetupInfo
  generatedAt: string
  analysisSeconds: number
  modelUsed: string
}