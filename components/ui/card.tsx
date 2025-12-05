'use client';

import type { JSX, ReactNode } from 'react';
import { cherrySurfaceClasses } from '@/lib/ui/theme';
import { cn } from '@/lib/ui/cn';

type CardTone = 'base' | 'muted' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const paddingBySize: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-5',
  lg: 'p-6 md:p-7',
};

type CardProps = {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
  padding?: CardPadding;
};

export function Card({
  children,
  className,
  tone = 'base',
  padding = 'md',
}: CardProps): JSX.Element {
  return (
    <div className={cn(cherrySurfaceClasses[tone], paddingBySize[padding], className)}>
      {children}
    </div>
  );
}
