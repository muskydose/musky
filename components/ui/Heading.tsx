import React from 'react';

export type HeadingLevel = 'hero' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
export type HeadingColor = 'forest' | 'gold' | 'white' | 'charcoal';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span';
  color?: HeadingColor;
  children: React.ReactNode;
}

const levelStyles: Record<HeadingLevel, string> = {
  hero: 'text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight',
  h1: 'text-2xl sm:text-4xl lg:text-5xl tracking-tight leading-tight',
  h2: 'text-xl sm:text-2xl lg:text-3xl tracking-tight leading-snug',
  h3: 'text-lg sm:text-xl lg:text-2xl tracking-normal leading-snug',
  h4: 'text-base sm:text-lg font-medium leading-normal',
  h5: 'text-sm sm:text-base font-medium leading-normal',
};

const colorStyles: Record<HeadingColor, string> = {
  forest: 'text-[#0f2d22]',
  gold: 'text-[#c5a059]',
  white: 'text-white',
  charcoal: 'text-[#22231F]',
};

export const Heading: React.FC<HeadingProps> = ({
  level = 'h2',
  as,
  color = 'forest',
  className = '',
  children,
  ...rest
}) => {
  const Component = as || (level === 'hero' ? 'h1' : level);

  return (
    <Component
      className={`font-momo-display font-normal ${levelStyles[level]} ${colorStyles[color]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Heading;

