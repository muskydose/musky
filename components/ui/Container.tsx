import React from 'react';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  noGutter?: boolean;
  children: React.ReactNode;
}

const sizeStyles: Record<ContainerSize, string> = {
  sm: 'max-w-(--md-container-sm,640px)',
  md: 'max-w-(--md-container-md,768px)',
  lg: 'max-w-(--md-container-lg,1024px)',
  xl: 'max-w-(--md-container-xl,1280px)',
  '2xl': 'max-w-(--md-container-2xl,1440px)',
  full: 'max-w-full',
};

export const Container: React.FC<ContainerProps> = ({
  size = 'xl',
  noGutter = false,
  className = '',
  children,
  ...rest
}) => {
  return (
    <div
      className={`mx-auto w-full ${!noGutter ? 'px-4 sm:px-6 lg:px-8' : ''} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Container;

