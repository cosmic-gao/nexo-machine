import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    'hooks/index': 'src/hooks/index.ts',
    'pipeline/index': 'src/pipeline/index.ts',
    'adapters/index': 'src/adapters/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  shims: false,
  esbuildOptions(options, context) {
    if (context.format === 'esm') {
      const entries = options.entryPoints
      const hasCli = entries 
        ? Object.values(entries).some(v => String(v).includes('cli'))
        : false
      options.banner = {
        js: hasCli ? '#!/usr/bin/env node' : '',
      }
    }
  },
})

