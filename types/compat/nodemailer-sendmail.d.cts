// reason: nodemailer sendmail transport lacks stable typings
// upstream: nodemailer@^7
// audit: 2026-01-28
// removeWhen: Remove once nodemailer ships transport typings
declare module 'nodemailer/lib/sendmail-transport/index.js' {
  class SendmailTransport {}
  namespace SendmailTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SendmailTransport;
}
