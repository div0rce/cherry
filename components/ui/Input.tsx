'use client';

import type { InputHTMLAttributes, JSX } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/ui/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref
): JSX.Element {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-cherry-border bg-cherry-bg px-3 py-2 text-cherry-text placeholder:text-cherry-text/70 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cherry-red',
        className
      )}
      {...rest}
    />
  );
});
