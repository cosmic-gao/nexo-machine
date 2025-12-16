import type {
  BuildAdapter,
  BuildOptions,
  BuildResult,
  AdapterRegistry,
  NexocHookable
} from '@nexoc/types'

export function createAdapterRegistry(): AdapterRegistry {
  const adapters = new Map<string, BuildAdapter>()

  return {
    register(adapter: BuildAdapter): void {
      adapters.set(adapter.name, adapter)
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

export class BuildManager {
  private registry: AdapterRegistry
  private hooks: NexocHookable
  private defaultAdapter?: string

  constructor(hooks: NexocHookable, registry: AdapterRegistry, defaultAdapter?: string) {
    this.hooks = hooks
    this.registry = registry
    this.defaultAdapter = defaultAdapter
  }

  registerAdapter(adapter: BuildAdapter): void {
    this.registry.register(adapter)
  }

  setDefaultAdapter(name: string): void {
    if (!this.registry.get(name)) {
      throw new Error(`Adapter "${name}" not found`)
    }
    this.defaultAdapter = name
  }

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

  async build(options: BuildOptions, adapterName?: string): Promise<BuildResult> {
    const adapter = this.getAdapter(adapterName)
    const startTime = Date.now()

    await this.hooks.callHook('build:before', options)

    try {
      if (adapter.setup) {
        await adapter.setup()
      }

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

  async clean(options: BuildOptions, adapterName?: string): Promise<void> {
    const adapter = this.getAdapter(adapterName)

    if (!adapter.clean) {
      return
    }

    await adapter.clean(options)
  }
}

export function defineAdapter(adapter: BuildAdapter): BuildAdapter {
  return adapter
}

export function createBuildManager(
  hooks: NexocHookable,
  registry: AdapterRegistry,
  defaultAdapter?: string
): BuildManager {
  return new BuildManager(hooks, registry, defaultAdapter)
}

export const nodeAdapter = defineAdapter({
  name: 'node',
  description: 'Node.js build adapter',
  targets: ['node'],

  async build(options: BuildOptions): Promise<BuildResult> {
    return {
      success: true,
      outputs: [`${options.outDir}/index.js`],
      duration: 0,
    }
  },

  async dev(_options: BuildOptions): Promise<void> {},

  async clean(_options: BuildOptions): Promise<void> {},
})

export const staticAdapter = defineAdapter({
  name: 'static',
  description: 'Static site build adapter',
  targets: ['static', 'browser'],

  async build(options: BuildOptions): Promise<BuildResult> {
    return {
      success: true,
      outputs: [`${options.outDir}/index.html`],
      duration: 0,
    }
  },

  async dev(_options: BuildOptions): Promise<void> {},
})

export const serverlessAdapter = defineAdapter({
  name: 'serverless',
  description: 'Serverless functions build adapter',
  targets: ['vercel', 'netlify', 'cloudflare'],

  async build(options: BuildOptions): Promise<BuildResult> {
    return {
      success: true,
      outputs: [`${options.outDir}/functions`],
      duration: 0,
    }
  },
})

export function getBuiltinAdapters(): BuildAdapter[] {
  return [nodeAdapter, staticAdapter, serverlessAdapter]
}

export function registerBuiltinAdapters(registry: AdapterRegistry): void {
  for (const adapter of getBuiltinAdapters()) {
    registry.register(adapter)
  }
}

export type { BuildAdapter, BuildOptions, BuildResult, AdapterRegistry } from '@nexoc/types'

