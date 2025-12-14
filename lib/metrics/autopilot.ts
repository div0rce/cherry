type Labels = Record<string, string | number | undefined>;

function noop(): void {
  // Intentionally empty (no-op metrics in local/test environments).
}

export function incrementCounter(_name: string, _labels?: Labels): void {
  noop();
}

export function observeDuration(_name: string, _ms: number, _labels?: Labels): void {
  noop();
}
