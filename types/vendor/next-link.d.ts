declare module 'next/link' {
  export * from 'next/dist/client/link.js';
  const Link: typeof import('next/dist/client/link.js').default;
  export default Link;
}
