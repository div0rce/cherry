'use client';

import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react';
import Link from 'next/link';
import type { LinkProps } from 'next/link';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-classes';
import { cn } from '@/lib/ui/cn';

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type ButtonLinkProps = CommonProps & LinkProps;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  fullWidth = false,
  type,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={cn(buttonClasses(variant, size), fullWidth ? 'w-full' : undefined, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  variant = 'primary',
  size = 'md',
  className,
  fullWidth = false,
  href,
  ...rest
}: ButtonLinkProps): JSX.Element {
  return (
    <Link
      href={href}
      className={cn(buttonClasses(variant, size), fullWidth ? 'w-full' : undefined, className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export { buttonClasses };
