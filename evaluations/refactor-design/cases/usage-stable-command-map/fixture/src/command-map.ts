export type CommandName = 'start' | 'stop';

const commandMap = {
  start: 'service start',
  stop: 'service stop',
} as const satisfies Record<CommandName, string>;

export function commandFor(name: CommandName): string {
  return commandMap[name];
}
