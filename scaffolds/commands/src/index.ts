import { defineCommand as cittyDefineCommand, runMain } from 'citty'
import type {
  Command,
  CommandContext,
  CommandOptions,
  CommandArgs,
  NexocInstance
} from '@nexoc/types'

export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private aliases: Map<string, string> = new Map()
  private groups: Map<string, Set<string>> = new Map()

  register(command: Command): void {
    const { name, aliases = [], group } = command.meta
    this.commands.set(name, command)

    for (const alias of aliases) {
      this.aliases.set(alias, name)
    }

    if (group) {
      if (!this.groups.has(group)) {
        this.groups.set(group, new Set())
      }
      this.groups.get(group)!.add(name)
    }
  }

  get(nameOrAlias: string): Command | undefined {
    if (this.commands.has(nameOrAlias)) {
      return this.commands.get(nameOrAlias)
    }

    const realName = this.aliases.get(nameOrAlias)
    if (realName) {
      return this.commands.get(realName)
    }

    return undefined
  }

  list(): Command[] {
    return Array.from(this.commands.values())
  }

  listVisible(): Command[] {
    return this.list().filter(cmd => !cmd.meta.hidden)
  }

  getByGroup(group: string): Command[] {
    const names = this.groups.get(group)
    if (!names) return []

    return Array.from(names)
      .map(name => this.commands.get(name)!)
      .filter(Boolean)
  }

  getGroups(): string[] {
    return Array.from(this.groups.keys())
  }

  remove(name: string): boolean {
    const command = this.commands.get(name)
    if (!command) return false

    for (const alias of command.meta.aliases || []) {
      this.aliases.delete(alias)
    }

    if (command.meta.group) {
      this.groups.get(command.meta.group)?.delete(name)
    }

    return this.commands.delete(name)
  }

  has(nameOrAlias: string): boolean {
    return this.commands.has(nameOrAlias) || this.aliases.has(nameOrAlias)
  }

  getCommandsMap(): Map<string, Command> {
    return this.commands
  }
}

export class CommandExecutor {
  private nexoc: NexocInstance

  constructor(nexoc: NexocInstance) {
    this.nexoc = nexoc
  }

  private parseArgs(
    rawArgs: string[],
    optionsDef?: CommandOptions,
    argsDef?: CommandArgs
  ): { options: Record<string, unknown>; args: Record<string, unknown> } {
    const options: Record<string, unknown> = {}
    const args: Record<string, unknown> = {}
    const positionalArgs: string[] = []

    if (optionsDef) {
      for (const [key, def] of Object.entries(optionsDef)) {
        if (def.default !== undefined) {
          options[key] = def.default
        }
      }
    }

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

    if (argsDef) {
      const argNames = Object.keys(argsDef)
      positionalArgs.forEach((value, index) => {
        if (argNames[index]) {
          args[argNames[index]] = value
        }
      })

      for (const [key, def] of Object.entries(argsDef)) {
        if (args[key] === undefined && def.default !== undefined) {
          args[key] = def.default
        }
      }
    }

    return { options, args }
  }

  private validate(
    options: Record<string, unknown>,
    args: Record<string, unknown>,
    optionsDef?: CommandOptions,
    argsDef?: CommandArgs
  ): void {
    if (optionsDef) {
      for (const [key, def] of Object.entries(optionsDef)) {
        if (def.required && options[key] === undefined) {
          throw new Error(`Missing required option: --${key}`)
        }
      }
    }

    if (argsDef) {
      for (const [key, def] of Object.entries(argsDef)) {
        if (def.required && args[key] === undefined) {
          throw new Error(`Missing required argument: ${key}`)
        }
      }
    }
  }

  async execute(command: Command, rawArgs: string[] = []): Promise<void> {
    const { options, args } = this.parseArgs(rawArgs, command.options, command.args)
    this.validate(options, args, command.options, command.args)

    const ctx: CommandContext = {
      options,
      args,
      rawArgs,
      nexoc: this.nexoc,
    }

    await this.nexoc.hooks.callHook('command:before', command.meta.name, { options, args })

    try {
      if (command.setup) {
        await command.setup(ctx)
      }

      await command.run(ctx)

      await this.nexoc.hooks.callHook('command:after', command.meta.name, { options, args })
    } catch (error) {
      await this.nexoc.hooks.callHook('command:error', command.meta.name, error as Error)
      throw error
    } finally {
      if (command.cleanup) {
        await command.cleanup(ctx)
      }
    }
  }
}

export function defineCommand<
  TOptions = Record<string, unknown>,
  TArgs = Record<string, unknown>
>(command: Command<TOptions, TArgs>): Command<TOptions, TArgs> {
  return command
}

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
export type { Command, CommandMeta, CommandOptions, CommandArgs, CommandContext } from '@nexoc/types'

