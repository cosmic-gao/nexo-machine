import { createHooks } from 'hookable'
import type { NexocHooks, NexocHookable } from '@nexoc/types'

type SimpleHookCallback = (...args: unknown[]) => void | Promise<void>

export function createNexocHooks(): NexocHookable {
  return createHooks<NexocHooks>()
}

export const hookUtils = {
  once(
    hooks: NexocHookable,
    name: keyof NexocHooks,
    fn: SimpleHookCallback
  ): () => void {
    let called = false
    const wrapper: SimpleHookCallback = async (...args) => {
      if (called) return
      called = true
      await fn(...args)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hooks.hook(name, wrapper as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => hooks.removeHook(name, wrapper as any)
  },

  when(
    hooks: NexocHookable,
    name: keyof NexocHooks,
    condition: (...args: unknown[]) => boolean,
    fn: SimpleHookCallback
  ): () => void {
    const wrapper: SimpleHookCallback = async (...args) => {
      if (condition(...args)) {
        await fn(...args)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hooks.hook(name, wrapper as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => hooks.removeHook(name, wrapper as any)
  },

  withTimeout(
    hooks: NexocHookable,
    name: keyof NexocHooks,
    fn: SimpleHookCallback,
    timeout: number
  ): () => void {
    const wrapper: SimpleHookCallback = async (...args) => {
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error(`Hook ${name} timed out after ${timeout}ms`)), timeout)
      })
      const fnPromise = Promise.resolve(fn(...args))
      await Promise.race([fnPromise, timeoutPromise])
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hooks.hook(name, wrapper as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => hooks.removeHook(name, wrapper as any)
  },

  registerMany(
    hooks: NexocHookable,
    hookMap: Partial<Record<keyof NexocHooks, SimpleHookCallback>>
  ): () => void {
    const removers: (() => void)[] = []
    for (const [name, fn] of Object.entries(hookMap)) {
      if (fn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hooks.hook(name as keyof NexocHooks, fn as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        removers.push(() => hooks.removeHook(name as keyof NexocHooks, fn as any))
      }
    }
    return () => removers.forEach(remove => remove())
  },
}

export function createHookDecorator(hooks: NexocHookable) {
  return function hookDecorator(hookName: keyof NexocHooks) {
    return function (
      _target: unknown,
      _propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value
      descriptor.value = async function (...args: unknown[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (hooks.callHook as any)(hookName, ...args)
        return originalMethod.apply(this, args)
      }
      return descriptor
    }
  }
}

export { createHooks } from 'hookable'
export type { NexocHooks, NexocHookable } from '@nexoc/types'

