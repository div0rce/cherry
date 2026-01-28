// reason: Fixture compat shim for @hexagon/base64
// upstream: @hexagon/base64@0.0.0
// audit: 2026-01-28
// removeWhen: Delete fixture once guardrail is verified

declare module '@hexagon/base64' {
  export function fromBase64(input: string): Uint8Array;
  export function toBase64(input: Uint8Array): string;
}
