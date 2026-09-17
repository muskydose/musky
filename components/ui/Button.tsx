'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { universalButtonMotion } from '@/lib/design-system/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'whatsapp';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#1b4332] text-[#d4af37] hover:bg-[#143225] border border-transparent shadow-xs',
  secondary: 'bg-[#faf5e8] text-[#1b4332] hover:bg-[#f0ebe0] border border-[#c5a059]/40 shadow-xs',
  outline: 'bg-white text-[#2d3748] hover:bg-[#f7fafc] border border-[#cbd5e0] shadow-xs',
  ghost: 'bg-transparent text-[#2d3748] hover:bg-[#0f2d22]/5 border border-transparent',
  gold: 'bg-[#c5a059] text-[#0f2d22] hover:bg-[#b38e46] border border-transparent shadow-xs font-bold',
  whatsapp: 'bg-[#25D366] text-white hover:bg-[#20ba5a] border border-transparent shadow-xs font-semibold',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-6 py-3.5 rounded-xl gap-2.5 font-semibold',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      fullWidth = false,
      className = '',
      disabled,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        whileTap={shouldReduceMotion || disabled || isLoading ? undefined : universalButtonMotion.tap}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans transition-colors duration-200 select-none focus:outline-none focus-visible:ring-3 focus-visible:ring-[#1b4332]/30 disabled:opacity-50 disabled:cursor-not-allowed ${
          fullWidth ? 'w-full' : ''
        } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...(rest as any)}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

