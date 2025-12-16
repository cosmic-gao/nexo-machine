import { defineCommand, runMain } from 'citty'
import { createNexoc, discoverCommands } from '@nexoc/core'
import { toCittyCommand } from '@nexoc/commands'
import type { Command } from '@nexoc/types'
import type { SubCommandsDef } from 'citty'

const nexoc = createNexoc({
  logLevel: 'info',
})

async function loadCommands(): Promise<Command[]> {
  const discovered = await discoverCommands()
  return discovered.map(d => d.command)
}

async function main() {
  const commands = await loadCommands()

  for (const command of commands) {
    nexoc.registerCommand(command)
  }

  const subCommands: SubCommandsDef = {}
  for (const command of commands) {
    subCommands[command.meta.name] = toCittyCommand(command, nexoc)
    
    if (command.meta.aliases) {
      for (const alias of command.meta.aliases) {
        subCommands[alias] = toCittyCommand(command, nexoc)
      }
    }
  }

  const mainCommand = defineCommand({
    meta: {
      name: 'nexoc',
      version: '0.1.0',
      description: 'Nexo CLI - A powerful scaffolding tool',
    },
    subCommands,
  })

  await runMain(mainCommand)
}

main()
