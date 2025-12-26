import type { InputHTMLAttributes, JSX } from 'react';
import { cn } from './utils.js';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export default function Input({ className, hasError = false, ...rest }: InputProps): JSX.Element {
  return (
    <input
      className={cn(
        'w-full rounded-md border px-3 py-2 text-sm text-[#0f172a] shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c]',
        hasError
          ? 'border-[#ef4444] focus-visible:outline-[#ef4444]'
          : 'border-[#e5e7eb] bg-white placeholder:text-[#9ca3af] hover:border-[#d1d5db]',
        className
      )}
      {...rest}
    />
  );
}
