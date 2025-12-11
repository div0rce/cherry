import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C21733] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'rounded-full bg-[#C21733] text-white hover:bg-[#E53E5A] active:bg-[#8B1020]',
        secondary:
          'rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#C21733] active:bg-[#F1F5F9]',
        subtle:
          'rounded-full bg-[#F8FAFC] text-[#0F172A] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]',
        ghost:
          'rounded-full text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] active:bg-[#F1F5F9]',
        destructive:
          'rounded-full bg-[#DC2626] text-white hover:bg-[#EF4444] active:bg-[#B91C1C]',
        link: 'text-[#C21733] underline-offset-4 hover:underline hover:text-[#E53E5A]',
      },
      size: {
        sm: 'h-8 px-4 text-sm',
        md: 'h-10 px-5 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
