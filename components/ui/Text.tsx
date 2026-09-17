import React from 'react';

export type TextVariant = 'lead' | 'body' | 'bodySm' | 'caption' | 'micro' | 'mono';
export type TextColor = 'primary' | 'muted' | 'subtle' | 'gold' | 'white' | 'forest';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  color?: TextColor;
  as?: 'p' | 'span' | 'div' | 'label';
  children: React.ReactNode;
}

const variantStyles: Record<TextVariant, string> = {
  lead: 'text-base sm:text-lg leading-relaxed',
  body: 'text-sm sm:text-base leading-relaxed',
  bodySm: 'text-xs sm:text-sm leading-normal',
  caption: 'text-xs leading-normal',
  micro: 'text-[11px] leading-tight',
  mono: 'font-mono text-xs leading-tight tracking-tight',
};

const colorStyles: Record<TextColor, string> = {
  primary: 'text-[#22231F]',
  muted: 'text-[#626c66]',
  subtle: 'text-[#8c9891]',
  gold: 'text-[#c5a059]',
  white: 'text-white',
  forest: 'text-[#0f2d22]',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  as: Component = 'p',
  className = '',
  children,
  ...rest
}) => {
  return (
    <Component
      className={`font-sans ${variantStyles[variant]} ${colorStyles[color]} ${className}`}
      {...(rest as any)}
    >
      {children}
    </Component>
  );
};

export default Text;
