import type { JSX, ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

type ShellProps = {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function Shell({ header, children, className, contentClassName }: ShellProps): JSX.Element {
  return (
    <div className={cn('min-h-screen bg-[#0b1021] text-[#eef2fb]', className)}>
      <div className={cn('mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8', contentClassName)}>
        {header != null ? <header className="space-y-2">{header}</header> : null}
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
