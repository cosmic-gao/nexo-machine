import type { Hookable } from 'hookable'

export type LifecyclePhase =
  | 'init'
  | 'validate'
  | 'prepare'
  | 'execute'
  | 'transform'
  | 'generate'
  | 'finalize'
  | 'cleanup'

export interface LifecycleContext<T = unknown> {
  phase: LifecyclePhase
  data: T
  aborted: boolean
  abortReason?: string
  meta: Record<string, unknown>
}

export interface PipelineStage<TInput = unknown, TOutput = unknown> {
  name: string
  description?: string
  execute: (input: TInput, ctx: PipelineContext) => Promise<TOutput> | TOutput
  skippable?: boolean
  dependencies?: string[]
  condition?: (ctx: PipelineContext) => boolean | Promise<boolean>
}

export interface PipelineContext {
  pipelineName: string
  currentStageIndex: number
  stageResults: Map<string, unknown>
  shared: Record<string, unknown>
  aborted: boolean
  skippedStages: Set<string>
}

export interface PipelineOptions {
  name: string
  parallel?: boolean
  onError?: 'stop' | 'continue' | 'retry'
  maxRetries?: number
}

export interface NexocHooks {
  'lifecycle:init': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:validate': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:prepare': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:execute': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:transform': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:generate': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:finalize': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:cleanup': (ctx: LifecycleContext) => void | Promise<void>
  'pipeline:start': (ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:before': (stage: PipelineStage, ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:after': (stage: PipelineStage, result: unknown, ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:error': (stage: PipelineStage, error: Error, ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:skip': (stage: PipelineStage, ctx: PipelineContext) => void | Promise<void>
  'pipeline:end': (ctx: PipelineContext) => void | Promise<void>
  'command:before': (command: string, args: unknown) => void | Promise<void>
  'command:after': (command: string, result: unknown) => void | Promise<void>
  'command:error': (command: string, error: Error) => void | Promise<void>
  'build:before': (options: BuildOptions) => void | Promise<void>
  'build:after': (result: BuildResult) => void | Promise<void>
  'build:error': (error: Error) => void | Promise<void>
}

export type NexocHookable = Hookable<NexocHooks>

export interface CommandMeta {
  name: string
  description: string
  aliases?: string[]
  hidden?: boolean
  group?: string
}

export interface CommandOptions {
  [key: string]: CommandOptionDef
}

export interface CommandOptionDef {
  type: 'string' | 'boolean' | 'number'
  description: string
  alias?: string
  default?: unknown
  required?: boolean
}

export interface CommandArgs {
  [key: string]: CommandArgDef
}

export interface CommandArgDef {
  description: string
  required?: boolean
  default?: unknown
}

export interface Command<TOptions = Record<string, unknown>, TArgs = Record<string, unknown>> {
  meta: CommandMeta
  options?: CommandOptions
  args?: CommandArgs
  subCommands?: Record<string, Command>
  run: (ctx: CommandContext<TOptions, TArgs>) => Promise<void> | void
  setup?: (ctx: CommandContext<TOptions, TArgs>) => Promise<void> | void
  cleanup?: (ctx: CommandContext<TOptions, TArgs>) => Promise<void> | void
}

export interface CommandContext<TOptions = Record<string, unknown>, TArgs = Record<string, unknown>> {
  options: TOptions
  args: TArgs
  rawArgs: string[]
  nexoc: NexocInstance
}

export interface BuildOptions {
  rootDir: string
  outDir: string
  production?: boolean
  [key: string]: unknown
}

export interface BuildResult {
  success: boolean
  outputs: string[]
  duration: number
  errors?: string[]
  warnings?: string[]
}

export interface BuildAdapter {
  name: string
  description?: string
  targets?: string[]
  build: (options: BuildOptions) => Promise<BuildResult>
  dev?: (options: BuildOptions) => Promise<void>
  clean?: (options: BuildOptions) => Promise<void>
  setup?: () => Promise<void>
}

export interface AdapterRegistry {
  register: (adapter: BuildAdapter) => void
  get: (name: string) => BuildAdapter | undefined
  list: () => BuildAdapter[]
  remove: (name: string) => boolean
}

export interface NexocConfig {
  rootDir?: string
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  defaultAdapter?: string
  plugins?: NexocPlugin[]
}

export interface NexocPlugin {
  name: string
  install: (nexoc: NexocInstance) => void | Promise<void>
}

export interface NexocInstance {
  config: NexocConfig
  hooks: NexocHookable
  commands: Map<string, Command>
  adapters: AdapterRegistry
  registerCommand: (command: Command) => void
  runCommand: (name: string, args?: string[]) => Promise<void>
  use: (plugin: NexocPlugin) => Promise<void>
}

