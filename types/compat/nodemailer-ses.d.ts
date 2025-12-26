/**
 * COMPATIBILITY SHIM
 * Reason: nodemailer SES transport lacks stable typings.
 * Scope: nodemailer/lib/ses-transport/index.js
 * Audit: review on nodemailer upgrade.
 */
declare module 'nodemailer/lib/ses-transport/index.js' {
  class SESTransport {}
  namespace SESTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SESTransport;
}
