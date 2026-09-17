import React from 'react';

export type GridCols = 1 | 2 | 3 | 4 | 'autoFill';
export type GridGap = 'sm' | 'md' | 'lg';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: GridCols;
  gap?: GridGap;
  children: React.ReactNode;
}

const colStyles: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  autoFill: 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
};

const gapStyles: Record<GridGap, string> = {
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
};

export const Grid: React.FC<GridProps> = ({
  cols = 3,
  gap = 'md',
  className = '',
  children,
  ...rest
}) => {
  return (
    <div
      className={`grid ${colStyles[cols]} ${gapStyles[gap]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Grid;

