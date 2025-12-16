import { defu } from 'defu'
import consola from 'consola'
import type { 
  NexocConfig, 
  NexocInstance, 
  NexocPlugin, 
  Command,
  NexocHookable,
  AdapterRegistry 
} from '../types'
import { createNexocHooks } from '../hooks'
import { CommandRegistry, CommandExecutor } from '../commands'
import { createAdapterRegistry, registerBuiltinAdapters } from '../adapters'

/**
 * 默认配置
 */
const defaultConfig: NexocConfig = {
  rootDir: process.cwd(),
  logLevel: 'info',
  defaultAdapter: 'node',
  plugins: [],
}

/**
 * 创建 Nexoc 实例
 */
export function createNexoc(userConfig: Partial<NexocConfig> = {}): NexocInstance {
  // 合并配置
  const config = defu(userConfig, defaultConfig) as NexocConfig

  // 设置日志级别
  consola.level = getLogLevel(config.logLevel)

  // 创建钩子系统
  const hooks = createNexocHooks()

  // 创建命令注册表
  const commandRegistry = new CommandRegistry()

  // 创建适配器注册表
  const adapterRegistry = createAdapterRegistry()
  
  // 注册内置适配器
  registerBuiltinAdapters(adapterRegistry)

  // 创建命令执行器（延迟初始化）
  let executor: CommandExecutor | null = null

  const instance: NexocInstance = {
    config,
    hooks,
    commands: commandRegistry['commands'],
    adapters: adapterRegistry,

    registerCommand(command: Command): void {
      commandRegistry.register(command)
      consola.debug(`Command "${command.meta.name}" registered`)
    },

    async runCommand(name: string, args: string[] = []): Promise<void> {
      const command = commandRegistry.get(name)
      if (!command) {
        throw new Error(`Command "${name}" not found`)
      }

      // 延迟初始化执行器
      if (!executor) {
        executor = new CommandExecutor(instance)
      }

      await executor.execute(command, args)
    },

    async use(plugin: NexocPlugin): Promise<void> {
      consola.debug(`Installing plugin "${plugin.name}"...`)
      await plugin.install(instance)
      consola.debug(`Plugin "${plugin.name}" installed`)
    },
  }

  return instance
}

/**
 * 获取日志级别
 */
function getLogLevel(level?: string): number {
  switch (level) {
    case 'debug': return 4
    case 'info': return 3
    case 'warn': return 2
    case 'error': return 1
    case 'silent': return 0
    default: return 3
  }
}

/**
 * 定义 Nexoc 配置
 */
export function defineNexocConfig(config: Partial<NexocConfig>): Partial<NexocConfig> {
  return config
}

/**
 * 定义插件
 */
export function definePlugin(plugin: NexocPlugin): NexocPlugin {
  return plugin
}

export { consola }

