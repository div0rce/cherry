// reason: nodemailer SMTP transport lacks stable typings
// upstream: nodemailer@^7
// audit: 2026-01-28
// removeWhen: Remove once nodemailer ships transport typings
declare module 'nodemailer/lib/smtp-transport/index.js' {
  class SMTPTransport {}
  namespace SMTPTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SMTPTransport;
}
