import type { JSX, LabelHTMLAttributes } from 'react';
import { cn } from './utils.js';

export default function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return (
    <label className={cn('text-sm font-medium text-[#111827]', className)} {...rest} />
  );
}
