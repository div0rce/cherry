// reason: nodemailer JSON transport lacks stable typings
// upstream: nodemailer@^7
// audit: 2026-01-28
// removeWhen: Remove once nodemailer ships transport typings
declare module 'nodemailer/lib/json-transport/index.js' {
  class JSONTransport {}
  namespace JSONTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = JSONTransport;
}
