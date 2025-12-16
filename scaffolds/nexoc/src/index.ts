// Core
export { createNexoc, defineNexocConfig, definePlugin, consola } from './core/nexoc'

// Types
export type {
  // Lifecycle
  LifecyclePhase,
  LifecycleContext,
  // Pipeline
  PipelineStage,
  PipelineContext,
  PipelineOptions,
  // Hooks
  NexocHooks,
  NexocHookable,
  // Commands
  Command,
  CommandMeta,
  CommandOptions,
  CommandArgs,
  CommandOptionDef,
  CommandArgDef,
  CommandContext,
  // Adapters
  BuildAdapter,
  BuildOptions,
  BuildResult,
  AdapterRegistry,
  // Instance
  NexocConfig,
  NexocPlugin,
  NexocInstance,
} from './types'

// Lifecycle
export { 
  LifecycleManager, 
  createLifecycle, 
  createLifecycleContext,
  LIFECYCLE_PHASES 
} from './lifecycle'

// Pipeline
export { 
  Pipeline, 
  createPipeline, 
  createPipelineContext,
  defineStage,
  composePipelines 
} from './pipeline'

// Hooks
export { 
  createNexocHooks, 
  hookUtils,
  createHookDecorator,
  createHooks 
} from './hooks'

// Commands
export { 
  CommandRegistry, 
  CommandExecutor,
  defineCommand,
  toCittyCommand,
  runMain 
} from './commands'

// Adapters
export {
  createAdapterRegistry,
  BuildManager,
  createBuildManager,
  defineAdapter,
  nodeAdapter,
  staticAdapter,
  serverlessAdapter,
  getBuiltinAdapters,
  registerBuiltinAdapters,
} from './adapters'

