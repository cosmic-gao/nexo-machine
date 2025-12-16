import consola from 'consola'
import type { 
  BuildAdapter, 
  BuildOptions, 
  BuildResult, 
  AdapterRegistry,
  NexocHookable 
} from '../types'

/**
 * 创建适配器注册表
 */
export function createAdapterRegistry(): AdapterRegistry {
  const adapters = new Map<string, BuildAdapter>()

  return {
    register(adapter: BuildAdapter): void {
      if (adapters.has(adapter.name)) {
        consola.warn(`Adapter "${adapter.name}" is already registered, overwriting...`)
      }
      adapters.set(adapter.name, adapter)
      consola.debug(`Adapter "${adapter.name}" registered`)
    },

    get(name: string): BuildAdapter | undefined {
      return adapters.get(name)
    },

    list(): BuildAdapter[] {
      return Array.from(adapters.values())
    },

    remove(name: string): boolean {
      return adapters.delete(name)
    },
  }
}

/**
 * 构建管理器 - 使用适配器模式
 */
export class BuildManager {
  private registry: AdapterRegistry
  private hooks: NexocHookable
  private defaultAdapter?: string

  constructor(hooks: NexocHookable, registry: AdapterRegistry, defaultAdapter?: string) {
    this.hooks = hooks
    this.registry = registry
    this.defaultAdapter = defaultAdapter
  }

  /**
   * 注册适配器
   */
  registerAdapter(adapter: BuildAdapter): void {
    this.registry.register(adapter)
  }

  /**
   * 设置默认适配器
   */
  setDefaultAdapter(name: string): void {
    if (!this.registry.get(name)) {
      throw new Error(`Adapter "${name}" not found`)
    }
    this.defaultAdapter = name
  }

  /**
   * 获取适配器
   */
  getAdapter(name?: string): BuildAdapter {
    const adapterName = name || this.defaultAdapter
    if (!adapterName) {
      throw new Error('No adapter specified and no default adapter set')
    }

    const adapter = this.registry.get(adapterName)
    if (!adapter) {
      throw new Error(`Adapter "${adapterName}" not found`)
    }

    return adapter
  }

  /**
   * 执行构建
   */
  async build(options: BuildOptions, adapterName?: string): Promise<BuildResult> {
    const adapter = this.getAdapter(adapterName)
    const startTime = Date.now()

    await this.hooks.callHook('build:before', options)

    try {
      // 初始化适配器
      if (adapter.setup) {
        await adapter.setup()
      }

      // 执行构建
      const result = await adapter.build(options)
      result.duration = Date.now() - startTime

      await this.hooks.callHook('build:after', result)

      return result
    } catch (error) {
      await this.hooks.callHook('build:error', error as Error)
      
      return {
        success: false,
        outputs: [],
        duration: Date.now() - startTime,
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * 启动开发服务器
   */
  async dev(options: BuildOptions, adapterName?: string): Promise<void> {
    const adapter = this.getAdapter(adapterName)
    
    if (!adapter.dev) {
      throw new Error(`Adapter "${adapter.name}" does not support dev mode`)
    }

    if (adapter.setup) {
      await adapter.setup()
    }

    await adapter.dev(options)
  }

  /**
   * 清理构建产物
   */
  async clean(options: BuildOptions, adapterName?: string): Promise<void> {
    const adapter = this.getAdapter(adapterName)
    
    if (!adapter.clean) {
      consola.warn(`Adapter "${adapter.name}" does not have a clean method`)
      return
    }

    await adapter.clean(options)
  }
}

/**
 * 定义构建适配器
 */
export function defineAdapter(adapter: BuildAdapter): BuildAdapter {
  return adapter
}

/**
 * 创建构建管理器
 */
export function createBuildManager(
  hooks: NexocHookable,
  registry: AdapterRegistry,
  defaultAdapter?: string
): BuildManager {
  return new BuildManager(hooks, registry, defaultAdapter)
}

// ============================================
// 内置适配器
// ============================================

/**
 * Node.js 适配器
 */
export const nodeAdapter = defineAdapter({
  name: 'node',
  description: 'Node.js build adapter',
  targets: ['node'],
  
  async build(options: BuildOptions): Promise<BuildResult> {
    consola.info(`Building for Node.js...`)
    consola.debug(`Root: ${options.rootDir}`)
    consola.debug(`Output: ${options.outDir}`)
    
    // 这里是占位实现，实际构建逻辑需要根据需求实现
    return {
      success: true,
      outputs: [`${options.outDir}/index.js`],
      duration: 0,
    }
  },

  async dev(options: BuildOptions): Promise<void> {
    consola.info(`Starting Node.js dev server...`)
    consola.debug(`Root: ${options.rootDir}`)
  },

  async clean(options: BuildOptions): Promise<void> {
    consola.info(`Cleaning ${options.outDir}...`)
  },
})

/**
 * 静态站点适配器
 */
export const staticAdapter = defineAdapter({
  name: 'static',
  description: 'Static site build adapter',
  targets: ['static', 'browser'],
  
  async build(options: BuildOptions): Promise<BuildResult> {
    consola.info(`Building static site...`)
    
    return {
      success: true,
      outputs: [`${options.outDir}/index.html`],
      duration: 0,
    }
  },

  async dev(options: BuildOptions): Promise<void> {
    consola.info(`Starting static dev server...`)
  },
})

/**
 * Serverless 适配器
 */
export const serverlessAdapter = defineAdapter({
  name: 'serverless',
  description: 'Serverless functions build adapter',
  targets: ['vercel', 'netlify', 'cloudflare'],
  
  async build(options: BuildOptions): Promise<BuildResult> {
    consola.info(`Building for serverless...`)
    
    return {
      success: true,
      outputs: [`${options.outDir}/functions`],
      duration: 0,
    }
  },
})

/**
 * 获取所有内置适配器
 */
export function getBuiltinAdapters(): BuildAdapter[] {
  return [nodeAdapter, staticAdapter, serverlessAdapter]
}

/**
 * 注册所有内置适配器
 */
export function registerBuiltinAdapters(registry: AdapterRegistry): void {
  for (const adapter of getBuiltinAdapters()) {
    registry.register(adapter)
  }
}

