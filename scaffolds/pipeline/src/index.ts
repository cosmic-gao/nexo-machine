import type {
  PipelineStage,
  PipelineContext,
  PipelineOptions,
  NexocHookable
} from '@nexoc/types'

export function createPipelineContext(name: string): PipelineContext {
  return {
    pipelineName: name,
    currentStageIndex: 0,
    stageResults: new Map(),
    shared: {},
    aborted: false,
    skippedStages: new Set(),
  }
}

export class Pipeline<TInput = unknown, TOutput = unknown> {
  private stages: PipelineStage[] = []
  private options: PipelineOptions
  private hooks: NexocHookable

  constructor(hooks: NexocHookable, options: PipelineOptions) {
    this.hooks = hooks
    this.options = options
  }

  get name(): string {
    return this.options.name
  }

  addStage<TStageInput = unknown, TStageOutput = unknown>(
    stage: PipelineStage<TStageInput, TStageOutput>
  ): this {
    this.stages.push(stage as PipelineStage)
    return this
  }

  insertStage<TStageInput = unknown, TStageOutput = unknown>(
    index: number,
    stage: PipelineStage<TStageInput, TStageOutput>
  ): this {
    this.stages.splice(index, 0, stage as PipelineStage)
    return this
  }

  insertBefore<TStageInput = unknown, TStageOutput = unknown>(
    targetName: string,
    stage: PipelineStage<TStageInput, TStageOutput>
  ): this {
    const index = this.stages.findIndex(s => s.name === targetName)
    if (index !== -1) {
      this.insertStage(index, stage)
    }
    return this
  }

  insertAfter<TStageInput = unknown, TStageOutput = unknown>(
    targetName: string,
    stage: PipelineStage<TStageInput, TStageOutput>
  ): this {
    const index = this.stages.findIndex(s => s.name === targetName)
    if (index !== -1) {
      this.insertStage(index + 1, stage)
    }
    return this
  }

  removeStage(name: string): boolean {
    const index = this.stages.findIndex(s => s.name === name)
    if (index !== -1) {
      this.stages.splice(index, 1)
      return true
    }
    return false
  }

  replaceStage<TStageInput = unknown, TStageOutput = unknown>(
    name: string,
    newStage: PipelineStage<TStageInput, TStageOutput>
  ): boolean {
    const index = this.stages.findIndex(s => s.name === name)
    if (index !== -1) {
      this.stages[index] = newStage as PipelineStage
      return true
    }
    return false
  }

  getStages(): readonly PipelineStage[] {
    return this.stages
  }

  private checkDependencies(stage: PipelineStage, ctx: PipelineContext): boolean {
    if (!stage.dependencies?.length) return true
    return stage.dependencies.every(dep =>
      ctx.stageResults.has(dep) || ctx.skippedStages.has(dep)
    )
  }

  private async executeStage(
    stage: PipelineStage,
    input: unknown,
    ctx: PipelineContext,
    retryCount = 0
  ): Promise<unknown> {
    if (stage.condition) {
      const shouldRun = await stage.condition(ctx)
      if (!shouldRun) {
        await this.hooks.callHook('pipeline:stage:skip', stage, ctx)
        ctx.skippedStages.add(stage.name)
        return input
      }
    }

    if (!this.checkDependencies(stage, ctx)) {
      throw new Error(
        `Stage "${stage.name}" has unmet dependencies: ${stage.dependencies?.join(', ')}`
      )
    }

    await this.hooks.callHook('pipeline:stage:before', stage, ctx)

    try {
      const result = await stage.execute(input, ctx)
      ctx.stageResults.set(stage.name, result)
      await this.hooks.callHook('pipeline:stage:after', stage, result, ctx)
      return result
    } catch (error) {
      await this.hooks.callHook('pipeline:stage:error', stage, error as Error, ctx)

      if (this.options.onError === 'retry' && retryCount < (this.options.maxRetries || 3)) {
        return this.executeStage(stage, input, ctx, retryCount + 1)
      }

      if (this.options.onError === 'continue' && stage.skippable) {
        ctx.skippedStages.add(stage.name)
        return input
      }

      throw error
    }
  }

  private async executeParallel(input: TInput, ctx: PipelineContext): Promise<TOutput> {
    const pending = new Set(this.stages.map(s => s.name))
    let currentInput: unknown = input

    while (pending.size > 0) {
      const executable = this.stages.filter(stage =>
        pending.has(stage.name) &&
        this.checkDependencies(stage, ctx)
      )

      if (executable.length === 0 && pending.size > 0) {
        throw new Error('Circular dependency detected in pipeline stages')
      }

      const results = await Promise.all(
        executable.map(stage =>
          this.executeStage(stage, currentInput, ctx)
        )
      )

      executable.forEach((stage, index) => {
        pending.delete(stage.name)
        currentInput = results[index]
      })

      if (ctx.aborted) break
    }

    return currentInput as TOutput
  }

  private async executeSequential(input: TInput, ctx: PipelineContext): Promise<TOutput> {
    let currentInput: unknown = input

    for (let i = 0; i < this.stages.length; i++) {
      if (ctx.aborted) break
      ctx.currentStageIndex = i
      const stage = this.stages[i]!
      currentInput = await this.executeStage(stage, currentInput, ctx)
    }

    return currentInput as TOutput
  }

  async execute(input: TInput): Promise<{ result: TOutput; context: PipelineContext }> {
    const ctx = createPipelineContext(this.options.name)
    await this.hooks.callHook('pipeline:start', ctx)

    try {
      const result = this.options.parallel
        ? await this.executeParallel(input, ctx)
        : await this.executeSequential(input, ctx)

      await this.hooks.callHook('pipeline:end', ctx)
      return { result, context: ctx }
    } catch (error) {
      ctx.aborted = true
      throw error
    }
  }

  abort(ctx: PipelineContext): void {
    ctx.aborted = true
  }
}

export function createPipeline<TInput = unknown, TOutput = unknown>(
  hooks: NexocHookable,
  options: PipelineOptions
): Pipeline<TInput, TOutput> {
  return new Pipeline<TInput, TOutput>(hooks, options)
}

export function defineStage<TInput = unknown, TOutput = unknown>(
  stage: PipelineStage<TInput, TOutput>
): PipelineStage<TInput, TOutput> {
  return stage
}

export function composePipelines<T>(
  hooks: NexocHookable,
  name: string,
  pipelines: Pipeline[]
): Pipeline<T, T> {
  const composed = createPipeline<T, T>(hooks, { name })

  pipelines.forEach((pipeline, index) => {
    composed.addStage({
      name: `pipeline:${pipeline.name}`,
      description: `Execute pipeline: ${pipeline.name}`,
      execute: async (input, ctx) => {
        const { result } = await pipeline.execute(input)
        ctx.shared[`pipeline:${index}:result`] = result
        return result
      },
    })
  })

  return composed
}

export type { PipelineStage, PipelineContext, PipelineOptions } from '@nexoc/types'

