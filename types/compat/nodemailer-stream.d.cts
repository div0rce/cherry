// reason: nodemailer stream transport lacks stable typings
// upstream: nodemailer@^7
// audit: 2026-01-28
// removeWhen: Remove once nodemailer ships transport typings
declare module 'nodemailer/lib/stream-transport/index.js' {
  class StreamTransport {}
  namespace StreamTransport {
    interface Options {
      [key: string]: unknown;
    }
  }
  export = StreamTransport;
}
