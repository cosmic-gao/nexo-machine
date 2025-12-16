import { defu } from 'defu'
import type {
  NexocConfig,
  NexocInstance,
  NexocPlugin,
  Command,
} from '@nexoc/types'
import { createNexocHooks } from '@nexoc/hooks'
import { CommandRegistry, CommandExecutor } from '@nexoc/commands'
import { createAdapterRegistry, registerBuiltinAdapters } from '@nexoc/adapters'

const defaultConfig: NexocConfig = {
  rootDir: process.cwd(),
  logLevel: 'info',
  defaultAdapter: 'node',
  plugins: [],
}

export function createNexoc(userConfig: Partial<NexocConfig> = {}): NexocInstance {
  const config = defu(userConfig, defaultConfig) as NexocConfig
  const hooks = createNexocHooks()
  const commandRegistry = new CommandRegistry()
  const adapterRegistry = createAdapterRegistry()

  registerBuiltinAdapters(adapterRegistry)

  let executor: CommandExecutor | null = null

  const instance: NexocInstance = {
    config,
    hooks,
    commands: commandRegistry.getCommandsMap(),
    adapters: adapterRegistry,

    registerCommand(command: Command): void {
      commandRegistry.register(command)
    },

    async runCommand(name: string, args: string[] = []): Promise<void> {
      const command = commandRegistry.get(name)
      if (!command) {
        throw new Error(`Command "${name}" not found`)
      }

      if (!executor) {
        executor = new CommandExecutor(instance)
      }

      await executor.execute(command, args)
    },

    async use(plugin: NexocPlugin): Promise<void> {
      await plugin.install(instance)
    },
  }

  return instance
}

export function defineNexocConfig(config: Partial<NexocConfig>): Partial<NexocConfig> {
  return config
}

export function definePlugin(plugin: NexocPlugin): NexocPlugin {
  return plugin
}

export type { NexocConfig, NexocInstance, NexocPlugin } from '@nexoc/types'

export {
  discoverCommands,
  discoverAndRegisterCommands,
  listRemoteCommands,
  installCommand,
  isCommandPackage,
  COMMAND_PACKAGE_PREFIX,
  COMMAND_KEYWORD,
  NPM_REGISTRY,
  GITHUB_API,
} from './discovery.js'
export type { DiscoveredCommand, RemoteCommandInfo, DiscoveryOptions } from './discovery.js'
