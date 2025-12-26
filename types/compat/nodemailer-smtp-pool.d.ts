/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer SMTP pool transport lacks stable typings.
 * Scope: nodemailer/lib/smtp-pool/index.js
 * Audit: review on nodemailer upgrade.
 */
declare module 'nodemailer/lib/smtp-pool/index.js' {
  class SMTPPool {}
  namespace SMTPPool {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SMTPPool;
}
