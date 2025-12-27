/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer sendmail transport lacks stable typings but is referenced by next-auth types.
 * Scope: nodemailer/lib/sendmail-transport/index.js
 * Audit: review on next-auth or nodemailer upgrade.
 */
declare module 'nodemailer/lib/sendmail-transport/index.js' {
  class SendmailTransport {}
  namespace SendmailTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SendmailTransport;
}
