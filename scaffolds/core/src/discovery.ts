import type { Command } from '@nexoc/types'

const COMMAND_PACKAGE_PREFIX = '@nexoc/command-'
const COMMAND_KEYWORD = 'nexoc-command'
const NPM_REGISTRY = 'https://registry.npmjs.org'
const GITHUB_API = 'https://api.github.com'

interface PackageJson {
  name: string
  version: string
  keywords?: string[]
  nexoc?: {
    command?: boolean
  }
}

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string
      version: string
      keywords?: string[]
    }
  }>
}

interface GithubRepo {
  name: string
  full_name: string
  html_url: string
  default_branch: string
}

export interface DiscoveredCommand {
  packageName: string
  command: Command
  source: 'local' | 'npm' | 'github'
}

export interface RemoteCommandInfo {
  name: string
  version?: string
  source: 'npm' | 'github'
  installCmd: string
}

export interface DiscoveryOptions {
  sources?: Array<'local' | 'npm' | 'github'>
  npmScope?: string
  githubOrg?: string
  githubTopic?: string
  cacheDir?: string
  timeout?: number
}

const defaultOptions: Required<DiscoveryOptions> = {
  sources: ['local', 'npm'],
  npmScope: '@nexoc',
  githubOrg: 'nexoc',
  githubTopic: 'nexoc-command',
  cacheDir: '.nexoc/cache',
  timeout: 5000,
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'nexoc-cli',
      },
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function searchNpmCommands(options: Required<DiscoveryOptions>): Promise<RemoteCommandInfo[]> {
  const commands: RemoteCommandInfo[] = []
  
  try {
    const searchUrl = `${NPM_REGISTRY}/-/v1/search?text=keywords:${COMMAND_KEYWORD}&size=100`
    const response = await fetchWithTimeout(searchUrl, options.timeout)
    
    if (!response.ok) return commands
    
    const data = await response.json() as NpmSearchResult
    
    for (const obj of data.objects) {
      const pkg = obj.package
      if (pkg.name.startsWith(COMMAND_PACKAGE_PREFIX)) {
        commands.push({
          name: pkg.name,
          version: pkg.version,
          source: 'npm',
          installCmd: `pnpm add ${pkg.name}`,
        })
      }
    }
  } catch {
    // Network error or timeout
  }
  
  return commands
}

async function searchGithubCommands(options: Required<DiscoveryOptions>): Promise<RemoteCommandInfo[]> {
  const commands: RemoteCommandInfo[] = []
  
  try {
    // Search by topic
    const searchUrl = `${GITHUB_API}/search/repositories?q=topic:${options.githubTopic}+org:${options.githubOrg}&per_page=100`
    const response = await fetchWithTimeout(searchUrl, options.timeout)
    
    if (!response.ok) return commands
    
    const data = await response.json() as { items: GithubRepo[] }
    
    for (const repo of data.items) {
      if (repo.name.startsWith('command-')) {
        commands.push({
          name: `@${options.githubOrg}/${repo.name}`,
          source: 'github',
          installCmd: `pnpm add github:${repo.full_name}`,
        })
      }
    }
  } catch {
    // Network error or timeout
  }
  
  return commands
}

async function getLocalInstalledPackages(): Promise<string[]> {
  const packages: string[] = []

  try {
    const fs = await import('fs')
    const path = await import('path')

    const checkNodeModules = async (baseDir: string) => {
      const nexocDir = path.join(baseDir, 'node_modules', '@nexoc')
      
      try {
        const entries = fs.readdirSync(nexocDir)
        
        for (const entryName of entries) {
          if (entryName.startsWith('command-')) {
            const pkgJsonPath = path.join(nexocDir, entryName, 'package.json')
            
            try {
              const pkgJson: PackageJson = JSON.parse(
                fs.readFileSync(pkgJsonPath, 'utf-8')
              )
              
              const isCommand = 
                pkgJson.nexoc?.command === true ||
                pkgJson.keywords?.includes(COMMAND_KEYWORD)
              
              if (isCommand) {
                packages.push(pkgJson.name)
              }
            } catch {
              // Skip invalid packages
            }
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }

    const cliDir = path.dirname(new URL(import.meta.url).pathname)
    const normalizedCliDir = process.platform === 'win32' && cliDir.startsWith('/')
      ? cliDir.slice(1)
      : cliDir
    
    const possibleRoots = [
      path.resolve(normalizedCliDir, '..'),
      path.resolve(normalizedCliDir, '../..'),
      path.resolve(normalizedCliDir, '../../..'),
      path.resolve(normalizedCliDir, '../../../..'),
    ]
    
    for (const root of possibleRoots) {
      await checkNodeModules(root)
    }

    // Check current working directory and parent directories
    let currentDir = process.cwd()
    const root = path.parse(currentDir).root
    
    while (currentDir !== root) {
      await checkNodeModules(currentDir)
      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) break
      currentDir = parentDir
    }
  } catch {
    // Filesystem access failed
  }

  return [...new Set(packages)]
}

async function tryImportCommand(packageName: string): Promise<Command | null> {
  try {
    const module = await import(packageName)
    return module.command || module.default
  } catch {
    return null
  }
}

export async function discoverCommands(
  options: DiscoveryOptions = {}
): Promise<DiscoveredCommand[]> {
  const opts = { ...defaultOptions, ...options }
  const discovered: DiscoveredCommand[] = []

  if (opts.sources.includes('local')) {
    const localPackages = await getLocalInstalledPackages()
    
    for (const packageName of localPackages) {
      const command = await tryImportCommand(packageName)
      if (command) {
        discovered.push({
          packageName,
          command,
          source: 'local',
        })
      }
    }
  }

  return discovered
}

export async function listRemoteCommands(
  options: DiscoveryOptions = {}
): Promise<RemoteCommandInfo[]> {
  const opts = { ...defaultOptions, ...options }
  const commands: RemoteCommandInfo[] = []
  const localPackages = await getLocalInstalledPackages()
  const localSet = new Set(localPackages)

  if (opts.sources.includes('npm')) {
    const npmCommands = await searchNpmCommands(opts)
    for (const cmd of npmCommands) {
      if (!localSet.has(cmd.name)) {
        commands.push(cmd)
      }
    }
  }

  if (opts.sources.includes('github')) {
    const githubCommands = await searchGithubCommands(opts)
    for (const cmd of githubCommands) {
      if (!localSet.has(cmd.name)) {
        commands.push(cmd)
      }
    }
  }

  return commands
}

export async function installCommand(
  packageName: string,
  options: { source?: 'npm' | 'github'; githubRepo?: string } = {}
): Promise<boolean> {
  const { spawn } = await import('child_process')
  
  let installCmd: string
  
  if (options.source === 'github' && options.githubRepo) {
    installCmd = `github:${options.githubRepo}`
  } else {
    installCmd = packageName
  }

  return new Promise((resolve) => {
    const child = spawn('pnpm', ['add', installCmd], {
      stdio: 'inherit',
      shell: true,
    })
    
    child.on('close', (code) => {
      resolve(code === 0)
    })
    
    child.on('error', () => {
      resolve(false)
    })
  })
}

export async function discoverAndRegisterCommands(
  registerFn: (command: Command) => void,
  options: DiscoveryOptions = {}
): Promise<string[]> {
  const discovered = await discoverCommands(options)
  const registered: string[] = []

  for (const { packageName, command } of discovered) {
    try {
      registerFn(command)
      registered.push(packageName)
    } catch {
      // Skip failed registrations
    }
  }

  return registered
}

export function isCommandPackage(packageName: string): boolean {
  return packageName.startsWith(COMMAND_PACKAGE_PREFIX)
}

export { COMMAND_PACKAGE_PREFIX, COMMAND_KEYWORD, NPM_REGISTRY, GITHUB_API }
