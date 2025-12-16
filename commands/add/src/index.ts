import type { Command } from '@nexoc/types'
import { listRemoteCommands, installCommand } from '@nexoc/core'

export const command: Command = {
  meta: {
    name: 'add',
    description: 'Search and install commands from npm or GitHub',
    aliases: ['install', 'i'],
    group: 'commands',
  },
  args: {
    name: {
      description: 'Command package name to install (e.g., @nexoc/command-foo)',
      required: false,
    },
  },
  options: {
    list: {
      type: 'boolean',
      description: 'List available remote commands',
      alias: 'l',
      default: false,
    },
    source: {
      type: 'string',
      description: 'Source to search (npm, github, all)',
      alias: 's',
      default: 'all',
    },
    github: {
      type: 'string',
      description: 'Install from GitHub repo (e.g., nexoc/command-foo)',
      alias: 'g',
    },
  },
  async run(ctx) {
    const { args, options } = ctx
    const packageName = args.name as string | undefined
    const listMode = options.list as boolean
    const source = options.source as string
    const githubRepo = options.github as string | undefined

    const sources: Array<'npm' | 'github'> = 
      source === 'all' ? ['npm', 'github'] :
      source === 'npm' ? ['npm'] :
      source === 'github' ? ['github'] : ['npm', 'github']

    if (listMode || !packageName) {
      console.log('\n📦 Searching for available commands...\n')
      
      const remoteCommands = await listRemoteCommands({ sources })
      
      if (remoteCommands.length === 0) {
        console.log('No remote commands found.')
        console.log('\nTip: Create your own command package with keyword "nexoc-command"')
        return
      }

      console.log('Available commands:\n')
      
      const npmCommands = remoteCommands.filter(c => c.source === 'npm')
      const githubCommands = remoteCommands.filter(c => c.source === 'github')

      if (npmCommands.length > 0) {
        console.log('📦 From npm:')
        for (const cmd of npmCommands) {
          console.log(`  ${cmd.name}@${cmd.version || 'latest'}`)
          console.log(`    Install: ${cmd.installCmd}\n`)
        }
      }

      if (githubCommands.length > 0) {
        console.log('🐙 From GitHub:')
        for (const cmd of githubCommands) {
          console.log(`  ${cmd.name}`)
          console.log(`    Install: ${cmd.installCmd}\n`)
        }
      }

      return
    }

    if (githubRepo) {
      console.log(`\n📥 Installing from GitHub: ${githubRepo}...\n`)
      const success = await installCommand(packageName, { 
        source: 'github', 
        githubRepo 
      })
      
      if (success) {
        console.log(`\n✅ Successfully installed ${packageName}`)
        console.log('Restart nexoc to use the new command.')
      } else {
        console.log(`\n❌ Failed to install ${packageName}`)
      }
      return
    }

    console.log(`\n📥 Installing ${packageName}...\n`)
    const success = await installCommand(packageName)
    
    if (success) {
      console.log(`\n✅ Successfully installed ${packageName}`)
      console.log('Restart nexoc to use the new command.')
    } else {
      console.log(`\n❌ Failed to install ${packageName}`)
    }
  },
}

export default command

