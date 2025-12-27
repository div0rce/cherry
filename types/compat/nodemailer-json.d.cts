/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer JSON transport lacks stable typings.
 * Scope: nodemailer/lib/json-transport/index.js
 * Audit: review on nodemailer upgrade.
 */
declare module 'nodemailer/lib/json-transport/index.js' {
  class JSONTransport {}
  namespace JSONTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = JSONTransport;
}
