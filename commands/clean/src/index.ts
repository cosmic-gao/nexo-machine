import type { Command } from '@nexoc/types'

export const command: Command = {
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
  async run(_ctx) {
    // TODO: Implement clean logic
  },
}

export default command

