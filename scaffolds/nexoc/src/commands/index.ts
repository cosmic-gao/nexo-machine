import { defineCommand as cittyDefineCommand, runMain } from 'citty'
import consola from 'consola'
import type { 
  Command, 
  CommandContext, 
  CommandMeta, 
  CommandOptions, 
  CommandArgs,
  NexocInstance 
} from '../types'

/**
 * 命令注册表
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private aliases: Map<string, string> = new Map()
  private groups: Map<string, Set<string>> = new Map()

  /**
   * 注册命令
   */
  register(command: Command): void {
    const { name, aliases = [], group } = command.meta
    
    if (this.commands.has(name)) {
      consola.warn(`Command "${name}" is already registered, overwriting...`)
    }
    
    this.commands.set(name, command)
    
    // 注册别名
    for (const alias of aliases) {
      this.aliases.set(alias, name)
    }
    
    // 注册到分组
    if (group) {
      if (!this.groups.has(group)) {
        this.groups.set(group, new Set())
      }
      this.groups.get(group)!.add(name)
    }
  }

  /**
   * 获取命令
   */
  get(nameOrAlias: string): Command | undefined {
    // 先尝试直接获取
    if (this.commands.has(nameOrAlias)) {
      return this.commands.get(nameOrAlias)
    }
    
    // 尝试通过别名获取
    const realName = this.aliases.get(nameOrAlias)
    if (realName) {
      return this.commands.get(realName)
    }
    
    return undefined
  }

  /**
   * 获取所有命令
   */
  list(): Command[] {
    return Array.from(this.commands.values())
  }

  /**
   * 获取可见命令（非隐藏）
   */
  listVisible(): Command[] {
    return this.list().filter(cmd => !cmd.meta.hidden)
  }

  /**
   * 按分组获取命令
   */
  getByGroup(group: string): Command[] {
    const names = this.groups.get(group)
    if (!names) return []
    
    return Array.from(names)
      .map(name => this.commands.get(name)!)
      .filter(Boolean)
  }

  /**
   * 获取所有分组
   */
  getGroups(): string[] {
    return Array.from(this.groups.keys())
  }

  /**
   * 移除命令
   */
  remove(name: string): boolean {
    const command = this.commands.get(name)
    if (!command) return false
    
    // 移除别名
    for (const alias of command.meta.aliases || []) {
      this.aliases.delete(alias)
    }
    
    // 从分组移除
    if (command.meta.group) {
      this.groups.get(command.meta.group)?.delete(name)
    }
    
    return this.commands.delete(name)
  }

  /**
   * 检查命令是否存在
   */
  has(nameOrAlias: string): boolean {
    return this.commands.has(nameOrAlias) || this.aliases.has(nameOrAlias)
  }
}

/**
 * 命令执行器
 */
export class CommandExecutor {
  private nexoc: NexocInstance

  constructor(nexoc: NexocInstance) {
    this.nexoc = nexoc
  }

  /**
   * 解析命令参数
   */
  private parseArgs(
    rawArgs: string[],
    optionsDef?: CommandOptions,
    argsDef?: CommandArgs
  ): { options: Record<string, unknown>; args: Record<string, unknown> } {
    const options: Record<string, unknown> = {}
    const args: Record<string, unknown> = {}
    const positionalArgs: string[] = []

    // 设置默认值
    if (optionsDef) {
      for (const [key, def] of Object.entries(optionsDef)) {
        if (def.default !== undefined) {
          options[key] = def.default
        }
      }
    }

    // 解析参数
    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i]
      
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=')
        const def = optionsDef?.[key]
        
        if (def) {
          if (def.type === 'boolean') {
            options[key] = value !== 'false'
          } else if (def.type === 'number') {
            options[key] = Number(value || rawArgs[++i])
          } else {
            options[key] = value || rawArgs[++i]
          }
        } else {
          options[key] = value || true
        }
      } else if (arg.startsWith('-')) {
        const alias = arg.slice(1)
        // 查找对应的选项
        if (optionsDef) {
          for (const [key, def] of Object.entries(optionsDef)) {
            if (def.alias === alias) {
              if (def.type === 'boolean') {
                options[key] = true
              } else if (def.type === 'number') {
                options[key] = Number(rawArgs[++i])
              } else {
                options[key] = rawArgs[++i]
              }
              break
            }
          }
        }
      } else {
        positionalArgs.push(arg)
      }
    }

    // 映射位置参数
    if (argsDef) {
      const argNames = Object.keys(argsDef)
      positionalArgs.forEach((value, index) => {
        if (argNames[index]) {
          args[argNames[index]] = value
        }
      })
      
      // 设置默认值
      for (const [key, def] of Object.entries(argsDef)) {
        if (args[key] === undefined && def.default !== undefined) {
          args[key] = def.default
        }
      }
    }

    return { options, args }
  }

  /**
   * 验证必填参数
   */
  private validate(
    options: Record<string, unknown>,
    args: Record<string, unknown>,
    optionsDef?: CommandOptions,
    argsDef?: CommandArgs
  ): void {
    // 验证必填选项
    if (optionsDef) {
      for (const [key, def] of Object.entries(optionsDef)) {
        if (def.required && options[key] === undefined) {
          throw new Error(`Missing required option: --${key}`)
        }
      }
    }

    // 验证必填参数
    if (argsDef) {
      for (const [key, def] of Object.entries(argsDef)) {
        if (def.required && args[key] === undefined) {
          throw new Error(`Missing required argument: ${key}`)
        }
      }
    }
  }

  /**
   * 执行命令
   */
  async execute(command: Command, rawArgs: string[] = []): Promise<void> {
    const { options, args } = this.parseArgs(rawArgs, command.options, command.args)
    
    // 验证
    this.validate(options, args, command.options, command.args)

    const ctx: CommandContext = {
      options,
      args,
      rawArgs,
      nexoc: this.nexoc,
    }

    // 触发 before hook
    await this.nexoc.hooks.callHook('command:before', command.meta.name, { options, args })

    try {
      // 执行 setup
      if (command.setup) {
        await command.setup(ctx)
      }

      // 执行命令
      await command.run(ctx)

      // 触发 after hook
      await this.nexoc.hooks.callHook('command:after', command.meta.name, { options, args })
    } catch (error) {
      // 触发 error hook
      await this.nexoc.hooks.callHook('command:error', command.meta.name, error as Error)
      throw error
    } finally {
      // 执行 cleanup
      if (command.cleanup) {
        await command.cleanup(ctx)
      }
    }
  }
}

/**
 * 定义命令
 */
export function defineCommand<
  TOptions = Record<string, unknown>,
  TArgs = Record<string, unknown>
>(command: Command<TOptions, TArgs>): Command<TOptions, TArgs> {
  return command
}

/**
 * 转换为 citty 命令格式
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function toCittyCommand(command: Command, nexoc: NexocInstance): ReturnType<typeof cittyDefineCommand> {
  const executor = new CommandExecutor(nexoc)
  
  const subCommands = command.subCommands 
    ? Object.fromEntries(
        Object.entries(command.subCommands).map(([name, subCmd]) => [
          name,
          toCittyCommand(subCmd, nexoc)
        ])
      )
    : undefined

  return cittyDefineCommand({
    meta: {
      name: command.meta.name,
      description: command.meta.description,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: convertArgsToCitty(command.options, command.args) as any,
    subCommands,
    run: async ({ args: cittyArgs }) => {
      // 转换 citty args 回原始格式
      const rawArgs = Object.entries(cittyArgs || {}).flatMap(([key, value]) => {
        if (typeof value === 'boolean') {
          return value ? [`--${key}`] : []
        }
        return [`--${key}`, String(value)]
      })
      
      await executor.execute(command, rawArgs)
    },
  })
}

/**
 * 转换参数定义为 citty 格式
 */
function convertArgsToCitty(
  options?: CommandOptions,
  args?: CommandArgs
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (options) {
    for (const [key, def] of Object.entries(options)) {
      result[key] = {
        type: def.type,
        description: def.description,
        alias: def.alias,
        default: def.default,
        required: def.required,
      }
    }
  }

  if (args) {
    for (const [key, def] of Object.entries(args)) {
      result[key] = {
        type: 'positional',
        description: def.description,
        default: def.default,
        required: def.required,
      }
    }
  }

  return result
}

export { runMain }

