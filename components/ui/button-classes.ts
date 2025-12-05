import { cn } from '@/lib/ui/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-cherry-500/60 bg-cherry-500 text-ink-950 shadow-card hover:bg-cherry-400 hover:text-ink-950',
  secondary:
    'border border-ink-700/70 bg-ink-900/70 text-cloud-50 shadow-soft hover:border-cherry-500/50 hover:text-cloud-50',
  ghost:
    'border border-transparent bg-transparent text-cloud-200 hover:border-ink-700/60 hover:bg-ink-800/40 hover:text-cloud-50',
  danger:
    'border border-rose-500/60 bg-rose-500/15 text-rose-50 shadow-soft hover:bg-rose-500/25',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-lg px-3 text-sm',
  md: 'h-10 rounded-lg px-4 text-sm',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cherry-400',
    sizeClasses[size],
    variantClasses[variant],
    extra
  );
}
