// reason: nodemailer package typings are required by auth email provider types
// upstream: nodemailer@^7
// audit: 2026-01-28
// removeWhen: Remove once nodemailer ships transport typings or auth providers stop importing them
// TODO(2026-01-28): Collapse transport shims to the minimal set actually referenced by the auth stack.
declare module 'nodemailer' {
  export interface TransportOptions {
    [key: string]: unknown;
  }

  export interface Transport<T = unknown> {
    name?: string;
    version?: string;
    options?: T;
  }
}
