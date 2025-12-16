import type { LifecyclePhase, LifecycleContext, NexocHookable } from '../types'

/**
 * 生命周期阶段顺序
 */
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

/**
 * 创建生命周期上下文
 */
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

/**
 * 生命周期管理器
 */
export class LifecycleManager<T = unknown> {
  private hooks: NexocHookable
  private currentPhase: LifecyclePhase | null = null
  private context: LifecycleContext<T> | null = null

  constructor(hooks: NexocHookable) {
    this.hooks = hooks
  }

  /**
   * 获取当前阶段
   */
  getCurrentPhase(): LifecyclePhase | null {
    return this.currentPhase
  }

  /**
   * 获取当前上下文
   */
  getContext(): LifecycleContext<T> | null {
    return this.context
  }

  /**
   * 中断生命周期
   */
  abort(reason?: string): void {
    if (this.context) {
      this.context.aborted = true
      this.context.abortReason = reason
    }
  }

  /**
   * 执行单个阶段
   */
  async runPhase(phase: LifecyclePhase, data: T, meta: Record<string, unknown> = {}): Promise<LifecycleContext<T>> {
    this.currentPhase = phase
    this.context = createLifecycleContext(phase, data, meta)

    const hookName = `lifecycle:${phase}` as const
    await this.hooks.callHook(hookName, this.context as LifecycleContext)

    return this.context
  }

  /**
   * 执行完整生命周期
   */
  async run(
    initialData: T,
    options: {
      /** 起始阶段 */
      startPhase?: LifecyclePhase
      /** 结束阶段 */
      endPhase?: LifecyclePhase
      /** 跳过的阶段 */
      skipPhases?: LifecyclePhase[]
      /** 阶段间数据转换 */
      transform?: (data: T, phase: LifecyclePhase) => T | Promise<T>
      /** 元数据 */
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
      
      // 跳过指定阶段
      if (skipPhases.includes(phase)) {
        continue
      }

      // 执行阶段
      lastContext = await this.runPhase(phase, data, meta)

      // 检查是否中断
      if (lastContext.aborted) {
        break
      }

      // 阶段间数据转换
      if (transform && i < endIndex) {
        data = await transform(lastContext.data, phase)
      } else {
        data = lastContext.data
      }
    }

    return lastContext || createLifecycleContext('init', initialData, meta)
  }

  /**
   * 重置生命周期状态
   */
  reset(): void {
    this.currentPhase = null
    this.context = null
  }
}

/**
 * 创建生命周期管理器
 */
export function createLifecycle<T = unknown>(hooks: NexocHookable): LifecycleManager<T> {
  return new LifecycleManager<T>(hooks)
}

