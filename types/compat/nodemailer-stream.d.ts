/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer stream transport lacks stable typings.
 * Scope: nodemailer/lib/stream-transport/index.js
 * Audit: review on nodemailer upgrade.
 */
declare module 'nodemailer/lib/stream-transport/index.js' {
  class StreamTransport {}
  namespace StreamTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = StreamTransport;
}
