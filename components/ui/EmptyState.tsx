import React from 'react';
import { PackageOpen } from 'lucide-react';
import Link from 'next/link';
import Heading from './Heading';
import Text from './Text';
import Button, { ButtonProps } from './Button';
import { cn } from '@/lib/utils';

export interface EmptyStateAction extends Omit<ButtonProps, 'children'> {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const iconSizeClasses = {
    sm: 'w-10 h-10 p-2.5 rounded-xl mb-3',
    md: 'w-14 h-14 p-3.5 rounded-2xl mb-4',
    lg: 'w-18 h-18 p-4 rounded-3xl mb-5',
  };

  const padClasses = {
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
  };

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'w-full flex flex-col items-center justify-center text-center rounded-2xl bg-canvas border border-border-neutral/60',
        padClasses[size],
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center bg-forest/5 text-forest border border-border-forest/10 shadow-2xs',
          iconSizeClasses[size]
        )}
      >
        {icon || <PackageOpen className="w-full h-full stroke-[1.5]" />}
      </div>

      <Heading
        level={size === 'sm' ? 'h4' : size === 'lg' ? 'h2' : 'h3'}
        className="mb-2 text-forest tracking-tight"
      >
        {title}
      </Heading>

      {description && (
        <Text
          variant={size === 'sm' ? 'bodySm' : 'body'}
          className="max-w-md text-forest/70 mb-6 font-normal"
        >
          {description}
        </Text>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button
                  variant={action.variant || 'primary'}
                  size={action.size || (size === 'sm' ? 'sm' : 'md')}
                  leftIcon={action.leftIcon}
                  rightIcon={action.rightIcon}
                >
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={action.variant || 'primary'}
                size={action.size || (size === 'sm' ? 'sm' : 'md')}
                onClick={action.onClick}
                leftIcon={action.leftIcon}
                rightIcon={action.rightIcon}
              >
                {action.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button
                  variant={secondaryAction.variant || 'outline'}
                  size={secondaryAction.size || (size === 'sm' ? 'sm' : 'md')}
                  leftIcon={secondaryAction.leftIcon}
                  rightIcon={secondaryAction.rightIcon}
                >
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={secondaryAction.variant || 'outline'}
                size={secondaryAction.size || (size === 'sm' ? 'sm' : 'md')}
                onClick={secondaryAction.onClick}
                leftIcon={secondaryAction.leftIcon}
                rightIcon={secondaryAction.rightIcon}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
