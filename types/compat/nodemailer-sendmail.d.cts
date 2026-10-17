// reason: nodemailer sendmail transport lacks stable typings
// upstream: nodemailer@^10
// audit: 2026-10-17
// removeWhen: Remove once nodemailer ships typings for its lib/* transport subpaths that @auth/core can import as types
declare module 'nodemailer/lib/sendmail-transport/index.js' {
  class SendmailTransport {}
  namespace SendmailTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SendmailTransport;
}
