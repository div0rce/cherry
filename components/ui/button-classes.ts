import { cn } from '@/lib/ui/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-cherry-red/80 bg-cherry-red text-cherry-bg shadow-soft hover:bg-cherry-red/90',
  secondary:
    'border border-cherry-border bg-cherry-surface text-cherry-text shadow-soft hover:border-cherry-red/60',
  ghost:
    'border border-transparent bg-transparent text-cherry-text hover:border-cherry-border hover:bg-cherry-surface/70',
  danger:
    'border border-cherry-red bg-cherry-red/10 text-cherry-red shadow-soft hover:bg-cherry-red/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-md px-3 text-sm',
  md: 'h-10 rounded-md px-4 text-base',
  lg: 'h-12 rounded-lg px-5 text-lg',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cherry-red',
    sizeClasses[size],
    variantClasses[variant],
    extra
  );
}
