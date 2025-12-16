import type { Command } from '@nexoc/types'

export const command: Command = {
  meta: {
    name: 'build',
    description: 'Build the project for production',
    group: 'build',
  },
  options: {
    outDir: {
      type: 'string',
      description: 'Output directory',
      alias: 'o',
      default: 'dist',
    },
    adapter: {
      type: 'string',
      description: 'Build adapter to use',
      alias: 'a',
      default: 'node',
    },
    minify: {
      type: 'boolean',
      description: 'Minify output',
      alias: 'm',
      default: true,
    },
  },
  async run(ctx) {
    const { options, nexoc } = ctx
    const adapter = nexoc.adapters.get(options.adapter as string)
    if (!adapter) return

    await adapter.build({
      rootDir: process.cwd(),
      outDir: options.outDir as string,
      production: true,
    })
  },
}

export default command

