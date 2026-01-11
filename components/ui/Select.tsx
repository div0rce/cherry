'use client';

import type { JSX, SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/ui/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref
): JSX.Element {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-[#1b2645] bg-[#0b1021] px-3 py-2 text-[#eef2fb] shadow-sm transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d]',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
