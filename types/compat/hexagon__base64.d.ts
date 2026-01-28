// reason: Missing types for @hexagon/base64 required by @simplewebauthn/server
// upstream: @hexagon/base64 (transitive via @simplewebauthn/server)
// audit: 2026-01-28
// removeWhen: Remove once @hexagon/base64 ships types or @types/hexagon__base64 exists

declare module '@hexagon/base64' {
  export function fromBase64(input: string): Uint8Array;
  export function toBase64(input: Uint8Array): string;
}
