import type { Command } from '@nexoc/types'

export const command: Command = {
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
  async run(_ctx) {
    console.log('init command2')
    // TODO: Implement init logic
  },
}

export default command

