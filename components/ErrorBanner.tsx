'use client';

import type { JSX } from 'react';

export function ErrorBanner({ message }: { message: string | null }): JSX.Element | null {
  if (!message) return null;
  return <p className="text-sm text-red-300">{message}</p>;
}
