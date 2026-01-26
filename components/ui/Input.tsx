'use client';

import type { InputHTMLAttributes, JSX } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/ui/cn.js';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref
): JSX.Element {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-[#1b2645] bg-[#0b1021] px-3 py-2 text-[#eef2fb] placeholder:text-[rgba(238,242,251,0.7)] shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d]',
        className
      )}
      {...rest}
    />
  );
});
