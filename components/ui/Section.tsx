import React from 'react';

export type SectionBg = 'canvas' | 'canvasAlt' | 'forest' | 'surface' | 'cream';
export type SectionSpacing = 'none' | 'sm' | 'md' | 'lg';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  bg?: SectionBg;
  background?: SectionBg;
  spacing?: SectionSpacing;
  as?: 'section' | 'div' | 'article';
  children: React.ReactNode;
}

const bgStyles: Record<SectionBg, string> = {
  canvas: 'bg-[#fcfbf7]',
  canvasAlt: 'bg-[#f5f1e8]',
  forest: 'bg-gradient-to-b from-[#0f2d22] to-[#1b4332] text-white',
  surface: 'bg-white',
  cream: 'bg-[#faf8f3]',
};

const spacingStyles: Record<SectionSpacing, string> = {
  none: 'py-0',
  sm: 'py-6 sm:py-8',
  md: 'py-8 sm:py-12 lg:py-14',
  lg: 'py-12 sm:py-16 lg:py-20',
};

export const Section: React.FC<SectionProps> = ({
  bg,
  background = 'canvas',
  spacing = 'md',
  as: Component = 'section',
  className = '',
  children,
  ...rest
}) => {
  const effectiveBg = bg || background;
  return (
    <Component
      className={`w-full relative ${bgStyles[effectiveBg]} ${spacingStyles[spacing]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Section;
