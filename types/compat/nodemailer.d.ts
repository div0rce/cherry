/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer package typings are required by next-auth email provider types.
 * Scope: nodemailer
 * Audit: review on next-auth or nodemailer upgrade.
 */
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
