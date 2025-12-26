'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/ui/cn.js';

type CardTone = 'base' | 'muted' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const paddingBySize: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-5',
  lg: 'p-6 md:p-7',
};

const toneClasses: Record<CardTone, string> = {
  base: 'rounded-xl border border-[rgba(27,38,69,0.6)] bg-[rgba(11,16,33,0.8)] shadow-[0_25px_80px_-40px_rgba(0,0,0,0.7)] backdrop-blur',
  muted:
    'rounded-xl border border-[rgba(27,38,69,0.4)] bg-[rgba(11,16,33,0.6)] shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)] backdrop-blur',
  accent:
    'rounded-xl border border-[rgba(255,77,109,0.4)] bg-[rgba(255,77,109,0.1)] shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)] backdrop-blur',
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
    <div className={cn(toneClasses[tone], paddingBySize[padding], className)}>
      {children}
    </div>
  );
}
