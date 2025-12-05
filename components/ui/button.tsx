'use client';

import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react';
import Link from 'next/link';
import type { LinkProps } from 'next/link';
import { buttonClasses as baseButtonClasses, type ButtonSize, type ButtonVariant } from './button-classes';

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type ButtonLinkProps = CommonProps & LinkProps;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={baseButtonClasses(variant, size, className)}
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
  href,
  ...rest
}: ButtonLinkProps): JSX.Element {
  return (
    <Link
      href={href}
      className={baseButtonClasses(variant, size, className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string
): string {
  return baseButtonClasses(variant, size, extra);
}
