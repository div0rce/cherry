export function renderDeterministicGreeting(
  name: string,
  now: Date
): { message: string; timestamp: number } {
  return {
    message: `hello-${name.toLowerCase()}`,
    timestamp: now.getTime(),
  };
}
