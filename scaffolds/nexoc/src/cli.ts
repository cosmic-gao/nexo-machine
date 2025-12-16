#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import { createNexoc } from './core/nexoc'
import { defineCommand as defineNexocCommand, toCittyCommand } from './commands'

const nexoc = createNexoc({
  logLevel: 'info',
})

const initCommand = defineNexocCommand({
  meta: {
    name: 'init',
    description: 'Initialize a new Nexo project',
    aliases: ['create', 'new'],
    group: 'project',
  },
  options: {
    template: {
      type: 'string',
      description: 'Project template to use',
      alias: 't',
      default: 'default',
    },
    force: {
      type: 'boolean',
      description: 'Force overwrite existing files',
      alias: 'f',
      default: false,
    },
  },
  args: {
    name: {
      description: 'Project name',
      required: false,
      default: 'my-nexo-project',
    },
  },
  async run(_ctx) {},
})

const devCommand = defineNexocCommand({
  meta: {
    name: 'dev',
    description: 'Start development server',
    aliases: ['serve', 'start'],
    group: 'development',
  },
  options: {
    port: {
      type: 'number',
      description: 'Port to listen on',
      alias: 'p',
      default: 3000,
    },
    host: {
      type: 'string',
      description: 'Host to bind to',
      alias: 'h',
      default: 'localhost',
    },
    open: {
      type: 'boolean',
      description: 'Open browser on start',
      alias: 'o',
      default: false,
    },
  },
  async run(_ctx) {},
})

const buildCommand = defineNexocCommand({
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
})

const generateCommand = defineNexocCommand({
  meta: {
    name: 'generate',
    description: 'Generate code from templates',
    aliases: ['g', 'gen'],
    group: 'scaffold',
  },
  args: {
    type: {
      description: 'Type of code to generate (component, page, api, etc.)',
      required: true,
    },
    name: {
      description: 'Name of the generated item',
      required: true,
    },
  },
  options: {
    dir: {
      type: 'string',
      description: 'Directory to generate in',
      alias: 'd',
    },
    dry: {
      type: 'boolean',
      description: 'Dry run (show what would be generated)',
      default: false,
    },
  },
  async run(_ctx) {},
})

const infoCommand = defineNexocCommand({
  meta: {
    name: 'info',
    description: 'Show project and system information',
    group: 'info',
  },
  async run(_ctx) {},
})

const cleanCommand = defineNexocCommand({
  meta: {
    name: 'clean',
    description: 'Clean build artifacts',
    group: 'build',
  },
  options: {
    all: {
      type: 'boolean',
      description: 'Clean all artifacts including cache',
      alias: 'a',
      default: false,
    },
  },
  async run(_ctx) {},
})

nexoc.registerCommand(initCommand)
nexoc.registerCommand(devCommand)
nexoc.registerCommand(buildCommand)
nexoc.registerCommand(generateCommand)
nexoc.registerCommand(infoCommand)
nexoc.registerCommand(cleanCommand)

const main = defineCommand({
  meta: {
    name: 'nexoc',
    version: '0.1.0',
    description: 'Nexo CLI - A powerful scaffolding tool',
  },
  subCommands: {
    init: toCittyCommand(initCommand, nexoc),
    dev: toCittyCommand(devCommand, nexoc),
    build: toCittyCommand(buildCommand, nexoc),
    generate: toCittyCommand(generateCommand, nexoc),
    info: toCittyCommand(infoCommand, nexoc),
    clean: toCittyCommand(cleanCommand, nexoc),
  },
})

runMain(main)
