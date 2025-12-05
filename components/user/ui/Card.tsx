import type { HTMLAttributes, JSX } from 'react';
import { cn } from './utils';

export default function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#e5e7eb] bg-white shadow-sm shadow-[#f3f4f6]',
        className
      )}
      {...rest}
    />
  );
}
