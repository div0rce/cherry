'use client';

import type { ChangeEvent, InputHTMLAttributes, JSX } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/ui/cn';

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { className, label, onCheckedChange, disabled, onChange, ...rest },
  ref
): JSX.Element {
  const hasLabel = typeof label === 'string' && label.trim().length > 0;

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange?.(event);
    onCheckedChange?.(event.target.checked);
  };

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        disabled={disabled}
        onChange={handleChange}
        {...rest}
      />
      <span className="relative inline-flex h-6 w-10 items-center rounded-full bg-[#1b2645] transition peer-checked:bg-[#34d399] peer-focus-visible:outline-[2px_solid_#ff4d6d] peer-focus-visible:outline-offset-2">
        <span className="inline-flex h-4 w-4 translate-x-1 rounded-full bg-[#0b1021] shadow-sm transition peer-checked:translate-x-5 peer-checked:bg-[#111a2f]" />
      </span>
      {hasLabel ? <span className="text-sm text-[#eef2fb]">{label}</span> : null}
    </label>
  );
});
