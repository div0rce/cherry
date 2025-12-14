'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

type BadgeProps = {
  children: ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
};

export function Badge({ children, variant = 'default', className }: BadgeProps): JSX.Element {
  const variantClass =
    variant === 'outline'
      ? 'border border-[#1b2645] text-[#eef2fb]'
      : 'border border-[#1b2645] bg-[#111a2f] text-[#eef2fb]';

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', variantClass, className)}
    >
      {children}
    </span>
  );
}
