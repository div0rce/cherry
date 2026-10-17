// reason: nodemailer SES transport lacks stable typings
// upstream: nodemailer@^10
// audit: 2026-10-17
// removeWhen: Remove once nodemailer ships typings for its lib/* transport subpaths that @auth/core can import as types
declare module 'nodemailer/lib/ses-transport/index.js' {
  class SESTransport {}
  namespace SESTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = SESTransport;
}
