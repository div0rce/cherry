'use client';

import type { JSX, SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/ui/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref
): JSX.Element {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-cherry-border bg-cherry-bg px-3 py-2 text-cherry-text shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cherry-red',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
