import type { Hookable } from 'hookable'

// ============================================
// Lifecycle Types - 生命周期类型定义
// ============================================

export type LifecyclePhase = 
  | 'init'        // 初始化阶段
  | 'validate'    // 验证阶段
  | 'prepare'     // 准备阶段
  | 'execute'     // 执行阶段
  | 'transform'   // 转换阶段
  | 'generate'    // 生成阶段
  | 'finalize'    // 完成阶段
  | 'cleanup'     // 清理阶段

export interface LifecycleContext<T = unknown> {
  /** 当前阶段 */
  phase: LifecyclePhase
  /** 上下文数据 */
  data: T
  /** 是否中断 */
  aborted: boolean
  /** 中断原因 */
  abortReason?: string
  /** 元数据 */
  meta: Record<string, unknown>
}

// ============================================
// Pipeline Types - 管道类型定义
// ============================================

export interface PipelineStage<TInput = unknown, TOutput = unknown> {
  /** 阶段名称 */
  name: string
  /** 阶段描述 */
  description?: string
  /** 执行函数 */
  execute: (input: TInput, ctx: PipelineContext) => Promise<TOutput> | TOutput
  /** 是否可跳过 */
  skippable?: boolean
  /** 依赖的前置阶段 */
  dependencies?: string[]
  /** 条件执行 */
  condition?: (ctx: PipelineContext) => boolean | Promise<boolean>
}

export interface PipelineContext {
  /** 管道名称 */
  pipelineName: string
  /** 当前阶段索引 */
  currentStageIndex: number
  /** 阶段结果缓存 */
  stageResults: Map<string, unknown>
  /** 共享数据 */
  shared: Record<string, unknown>
  /** 是否中断 */
  aborted: boolean
  /** 跳过的阶段 */
  skippedStages: Set<string>
}

export interface PipelineOptions {
  /** 管道名称 */
  name: string
  /** 是否并行执行无依赖的阶段 */
  parallel?: boolean
  /** 错误处理策略 */
  onError?: 'stop' | 'continue' | 'retry'
  /** 最大重试次数 */
  maxRetries?: number
}

// ============================================
// Hook Types - 钩子类型定义
// ============================================

export interface NexocHooks {
  // Lifecycle hooks
  'lifecycle:init': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:validate': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:prepare': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:execute': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:transform': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:generate': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:finalize': (ctx: LifecycleContext) => void | Promise<void>
  'lifecycle:cleanup': (ctx: LifecycleContext) => void | Promise<void>
  
  // Pipeline hooks
  'pipeline:start': (ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:before': (stage: PipelineStage, ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:after': (stage: PipelineStage, result: unknown, ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:error': (stage: PipelineStage, error: Error, ctx: PipelineContext) => void | Promise<void>
  'pipeline:stage:skip': (stage: PipelineStage, ctx: PipelineContext) => void | Promise<void>
  'pipeline:end': (ctx: PipelineContext) => void | Promise<void>
  
  // Command hooks
  'command:before': (command: string, args: unknown) => void | Promise<void>
  'command:after': (command: string, result: unknown) => void | Promise<void>
  'command:error': (command: string, error: Error) => void | Promise<void>
  
  // Build hooks
  'build:before': (options: BuildOptions) => void | Promise<void>
  'build:after': (result: BuildResult) => void | Promise<void>
  'build:error': (error: Error) => void | Promise<void>
}

export type NexocHookable = Hookable<NexocHooks>

// ============================================
// Command Types - 命令类型定义
// ============================================

export interface CommandMeta {
  /** 命令名称 */
  name: string
  /** 命令描述 */
  description: string
  /** 命令别名 */
  aliases?: string[]
  /** 是否隐藏 */
  hidden?: boolean
  /** 命令分组 */
  group?: string
}

export interface CommandOptions {
  [key: string]: CommandOptionDef
}

export interface CommandOptionDef {
  /** 选项类型 */
  type: 'string' | 'boolean' | 'number'
  /** 选项描述 */
  description: string
  /** 简写 */
  alias?: string
  /** 默认值 */
  default?: unknown
  /** 是否必填 */
  required?: boolean
}

export interface CommandArgs {
  [key: string]: CommandArgDef
}

export interface CommandArgDef {
  /** 参数描述 */
  description: string
  /** 是否必填 */
  required?: boolean
  /** 默认值 */
  default?: unknown
}

export interface Command<TOptions = Record<string, unknown>, TArgs = Record<string, unknown>> {
  /** 命令元信息 */
  meta: CommandMeta
  /** 命令选项定义 */
  options?: CommandOptions
  /** 命令参数定义 */
  args?: CommandArgs
  /** 子命令 */
  subCommands?: Record<string, Command>
  /** 执行函数 */
  run: (ctx: CommandContext<TOptions, TArgs>) => Promise<void> | void
  /** 设置函数 (可选) */
  setup?: (ctx: CommandContext<TOptions, TArgs>) => Promise<void> | void
  /** 清理函数 (可选) */
  cleanup?: (ctx: CommandContext<TOptions, TArgs>) => Promise<void> | void
}

export interface CommandContext<TOptions = Record<string, unknown>, TArgs = Record<string, unknown>> {
  /** 解析后的选项 */
  options: TOptions
  /** 解析后的参数 */
  args: TArgs
  /** 原始参数 */
  rawArgs: string[]
  /** Nexoc 实例 */
  nexoc: NexocInstance
}

// ============================================
// Adapter Types - 适配器类型定义
// ============================================

export interface BuildOptions {
  /** 项目根目录 */
  rootDir: string
  /** 输出目录 */
  outDir: string
  /** 是否生产模式 */
  production?: boolean
  /** 额外配置 */
  [key: string]: unknown
}

export interface BuildResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件列表 */
  outputs: string[]
  /** 构建耗时 (ms) */
  duration: number
  /** 错误信息 */
  errors?: string[]
  /** 警告信息 */
  warnings?: string[]
}

export interface BuildAdapter {
  /** 适配器名称 */
  name: string
  /** 适配器描述 */
  description?: string
  /** 支持的目标平台 */
  targets?: string[]
  /** 构建方法 */
  build: (options: BuildOptions) => Promise<BuildResult>
  /** 开发服务器 (可选) */
  dev?: (options: BuildOptions) => Promise<void>
  /** 清理方法 (可选) */
  clean?: (options: BuildOptions) => Promise<void>
  /** 初始化方法 (可选) */
  setup?: () => Promise<void>
}

export interface AdapterRegistry {
  /** 注册适配器 */
  register: (adapter: BuildAdapter) => void
  /** 获取适配器 */
  get: (name: string) => BuildAdapter | undefined
  /** 获取所有适配器 */
  list: () => BuildAdapter[]
  /** 移除适配器 */
  remove: (name: string) => boolean
}

// ============================================
// Nexoc Instance Types - 实例类型定义
// ============================================

export interface NexocConfig {
  /** 项目根目录 */
  rootDir?: string
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  /** 默认构建适配器 */
  defaultAdapter?: string
  /** 插件列表 */
  plugins?: NexocPlugin[]
}

export interface NexocPlugin {
  /** 插件名称 */
  name: string
  /** 安装方法 */
  install: (nexoc: NexocInstance) => void | Promise<void>
}

export interface NexocInstance {
  /** 配置 */
  config: NexocConfig
  /** 钩子系统 */
  hooks: NexocHookable
  /** 命令注册表 */
  commands: Map<string, Command>
  /** 适配器注册表 */
  adapters: AdapterRegistry
  /** 注册命令 */
  registerCommand: (command: Command) => void
  /** 执行命令 */
  runCommand: (name: string, args?: string[]) => Promise<void>
  /** 注册插件 */
  use: (plugin: NexocPlugin) => Promise<void>
}

