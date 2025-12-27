/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer SMTP transport lacks stable typings.
 * Scope: nodemailer/lib/smtp-transport/index.js
 * Audit: review on nodemailer upgrade.
 */
declare module 'nodemailer/lib/smtp-transport/index.js' {
  class SMTPTransport {}
  namespace SMTPTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SMTPTransport;
}
