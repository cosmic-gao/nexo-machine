import type { Command } from '@nexoc/types'

export const command: Command = {
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
  async run(_ctx) {
    // TODO: Implement dev server logic
  },
}

export default command

