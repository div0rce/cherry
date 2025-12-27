const value: string | null = Math.random() > 0.5 ? 'ok' : null;

if (value) {
  process.stdout.write('guardrail-self-fixture\n');
}
