// reason: nodemailer SES transport lacks stable typings
// upstream: nodemailer@^7
// audit: 2026-01-28
// removeWhen: Remove once nodemailer ships transport typings
declare module 'nodemailer/lib/ses-transport/index.js' {
  class SESTransport {}
  namespace SESTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SESTransport;
}
