import type { Command } from '@nexoc/types'

export const command: Command = {
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
  async run(_ctx) {
    // TODO: Implement generate logic
  },
}

export default command

