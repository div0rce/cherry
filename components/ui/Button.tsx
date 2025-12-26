'use client';

import * as React from 'react';
import type { JSX } from 'react';
import Link from 'next/link';
import type { LinkProps } from 'next/link';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { buttonVariants, type ButtonVariant, type ButtonSize } from './button-classes.js';
import { cn } from '@/lib/ui/cn';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
): JSX.Element {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  );
});
Button.displayName = 'Button';

export interface ButtonLinkProps
  extends Omit<LinkProps, 'disabled'>,
    VariantProps<typeof buttonVariants> {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ButtonLink({
  className,
  variant,
  size,
  href,
  children,
  disabled = false,
  ...props
}: ButtonLinkProps): JSX.Element {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn(className, disabled && 'pointer-events-none opacity-50')}
    >
      <Link
        href={disabled ? '#' : href}
        aria-disabled={disabled}
        {...(disabled && { onClick: (e) => e.preventDefault() })}
        {...props}
      >
        {children}
      </Link>
    </Button>
  );
}

export { Button, ButtonLink, buttonVariants };
export type { ButtonVariant, ButtonSize };
