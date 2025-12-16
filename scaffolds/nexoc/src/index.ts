export { createNexoc, defineNexocConfig, definePlugin } from '@nexoc/core'
export { createNexocHooks, hookUtils, createHookDecorator, createHooks } from '@nexoc/hooks'
export { LifecycleManager, createLifecycle, createLifecycleContext, LIFECYCLE_PHASES } from '@nexoc/lifecycle'
export { Pipeline, createPipeline, createPipelineContext, defineStage, composePipelines } from '@nexoc/pipeline'
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
} from '@nexoc/adapters'
export {
  CommandRegistry,
  CommandExecutor,
  defineCommand,
  toCittyCommand,
  runMain,
} from '@nexoc/commands'

export type {
  LifecyclePhase,
  LifecycleContext,
  PipelineStage,
  PipelineContext,
  PipelineOptions,
  NexocHooks,
  NexocHookable,
  Command,
  CommandMeta,
  CommandOptions,
  CommandArgs,
  CommandOptionDef,
  CommandArgDef,
  CommandContext,
  BuildAdapter,
  BuildOptions,
  BuildResult,
  AdapterRegistry,
  NexocConfig,
  NexocPlugin,
  NexocInstance,
} from '@nexoc/types'
