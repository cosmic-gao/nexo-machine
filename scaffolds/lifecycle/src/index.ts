import type { LifecyclePhase, LifecycleContext, NexocHookable } from '@nexoc/types'

export const LIFECYCLE_PHASES: LifecyclePhase[] = [
  'init',
  'validate',
  'prepare',
  'execute',
  'transform',
  'generate',
  'finalize',
  'cleanup',
]

export function createLifecycleContext<T = unknown>(
  phase: LifecyclePhase,
  data: T,
  meta: Record<string, unknown> = {}
): LifecycleContext<T> {
  return {
    phase,
    data,
    aborted: false,
    meta,
  }
}

export class LifecycleManager<T = unknown> {
  private hooks: NexocHookable
  private currentPhase: LifecyclePhase | null = null
  private context: LifecycleContext<T> | null = null

  constructor(hooks: NexocHookable) {
    this.hooks = hooks
  }

  getCurrentPhase(): LifecyclePhase | null {
    return this.currentPhase
  }

  getContext(): LifecycleContext<T> | null {
    return this.context
  }

  abort(reason?: string): void {
    if (this.context) {
      this.context.aborted = true
      this.context.abortReason = reason
    }
  }

  async runPhase(phase: LifecyclePhase, data: T, meta: Record<string, unknown> = {}): Promise<LifecycleContext<T>> {
    this.currentPhase = phase
    this.context = createLifecycleContext(phase, data, meta)
    const hookName = `lifecycle:${phase}` as const
    await this.hooks.callHook(hookName, this.context as LifecycleContext)
    return this.context
  }

  async run(
    initialData: T,
    options: {
      startPhase?: LifecyclePhase
      endPhase?: LifecyclePhase
      skipPhases?: LifecyclePhase[]
      transform?: (data: T, phase: LifecyclePhase) => T | Promise<T>
      meta?: Record<string, unknown>
    } = {}
  ): Promise<LifecycleContext<T>> {
    const {
      startPhase = 'init',
      endPhase = 'cleanup',
      skipPhases = [],
      transform,
      meta = {},
    } = options

    const startIndex = LIFECYCLE_PHASES.indexOf(startPhase)
    const endIndex = LIFECYCLE_PHASES.indexOf(endPhase)

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`Invalid lifecycle phase: ${startPhase} or ${endPhase}`)
    }

    let data = initialData
    let lastContext: LifecycleContext<T> | null = null

    for (let i = startIndex; i <= endIndex; i++) {
      const phase = LIFECYCLE_PHASES[i]

      if (skipPhases.includes(phase)) {
        continue
      }

      lastContext = await this.runPhase(phase, data, meta)

      if (lastContext.aborted) {
        break
      }

      if (transform && i < endIndex) {
        data = await transform(lastContext.data, phase)
      } else {
        data = lastContext.data
      }
    }

    return lastContext || createLifecycleContext('init', initialData, meta)
  }

  reset(): void {
    this.currentPhase = null
    this.context = null
  }
}

export function createLifecycle<T = unknown>(hooks: NexocHookable): LifecycleManager<T> {
  return new LifecycleManager<T>(hooks)
}

export type { LifecyclePhase, LifecycleContext } from '@nexoc/types'

