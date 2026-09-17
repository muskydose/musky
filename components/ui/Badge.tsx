import React from 'react';

export type BadgeVariant = 'gold' | 'green' | 'forest' | 'leaf' | 'henna' | 'neutral' | 'status' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  gold: 'bg-[#faf5e8] text-[#c5a059] border border-[#c5a059]/40',
  green: 'bg-[#1b4332] text-[#d4af37] border border-[#d4af37]/40',
  forest: 'bg-[#0f2d22] text-[#faf5e8] border border-[#c5a059]/40',
  leaf: 'bg-[#e8f3ed] text-[#2d6a4f] border border-[#2d6a4f]/20',
  henna: 'bg-[#fdf2ee] text-[#9A4F32] border border-[#9A4F32]/30',
  neutral: 'bg-[#edf2f7] text-[#4a5568] border border-[#cbd5e0]',
  status: 'bg-[#1b4332]/10 text-[#1b4332] border border-[#1b4332]/20',
  outline: 'bg-transparent text-[#626c66] border border-[#e8e2d5]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider',
  md: 'text-xs px-2.5 py-1 rounded-full font-semibold',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gold',
  size = 'sm',
  icon,
  pulse = false,
  className = '',
  children,
  ...rest
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
