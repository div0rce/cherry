/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/next-image-types-global.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

// this file is conditionally added/removed to next-env.d.ts
// if the static image import handling is enabled

declare module '*.png' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.svg' {
  /**
   * Use `any` to avoid conflicts with
   * `@svgr/webpack` plugin or
   * `babel-plugin-inline-react-svg` plugin.
   */
  const content: any;
  export default content;
}

declare module '*.jpg' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.jpeg' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.gif' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.webp' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.avif' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.ico' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}

declare module '*.bmp' {
  const content: import('next/dist/shared/lib/image-external.js').StaticImageData;
  export default content;
}
