import type { Command } from '@nexoc/types'

export const command: Command = {
  meta: {
    name: 'info',
    description: 'Show project and system information',
    group: 'info',
  },
  async run(_ctx) {
    // TODO: Implement info logic
  },
}

export default command

