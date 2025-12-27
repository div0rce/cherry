import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react';
import { cn } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626] active:bg-[#b91c1c] disabled:bg-[#ef4444]',
  secondary:
    'border border-[#e5e7eb] bg-white text-[#b91c1c] hover:bg-[#fef2f2] active:bg-[#fee2e2]',
  ghost: 'text-[#b91c1c] hover:bg-[#fef2f2] active:bg-[#fee2e2]',
};

export default function Button({
  children,
  className,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  ...rest
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
      ) : null}
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}
