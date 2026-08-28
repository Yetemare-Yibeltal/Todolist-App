import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const skeletonVariants = cva(
  'animate-pulse rounded-md bg-muted',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        primary: 'bg-primary/20',
        secondary: 'bg-secondary/20',
        success: 'bg-success/20',
        warning: 'bg-warning/20',
        destructive: 'bg-destructive/20',
        info: 'bg-info/20',
        shimmer: 'relative overflow-hidden bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        gradient: 'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted',
      },
      size: {
        xs: 'h-2',
        sm: 'h-4',
        default: 'h-6',
        md: 'h-8',
        lg: 'h-10',
        xl: 'h-12',
        '2xl': 'h-16',
        '3xl': 'h-24',
        '4xl': 'h-32',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
        sm: 'w-12',
        md: 'w-24',
        lg: 'w-48',
        xl: 'w-64',
        '2xl': 'w-96',
        '3xl': 'w-128',
        '4xl': 'w-192',
        '5xl': 'w-256',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        default: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      width: 'full',
      rounded: 'default',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  asChild?: boolean;
  count?: number;
  delay?: number;
  className?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      rounded,
      count = 1,
      delay = 0,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const style = {
      animationDelay: `${delay}ms`,
    };

    const skeletons = Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        ref={index === 0 ? ref : undefined}
        className={cn(skeletonVariants({ variant, size, width, rounded, className }))}
        style={{
          ...style,
          animationDelay: `${delay + index * 100}ms`,
        }}
        {...props}
      />
    ));

    if (count === 1) {
      return skeletons[0];
    }

    return <div className="space-y-2">{skeletons}</div>;
  }
);
Skeleton.displayName = 'Skeleton';

interface SkeletonAvatarProps extends Omit<SkeletonProps, 'size'> {
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      default: 'h-10 w-10',
      md: 'h-12 w-12',
      lg: 'h-14 w-14',
      xl: 'h-16 w-16',
      '2xl': 'h-20 w-20',
      '3xl': 'h-24 w-24',
      '4xl': 'h-32 w-32',
    };

    return (
      <Skeleton
        ref={ref}
        className={cn('rounded-full', sizeClasses[size], className)}
        {...props}
      />
    );
  }
);
SkeletonAvatar.displayName = 'SkeletonAvatar';

interface SkeletonTextProps extends Omit<SkeletonProps, 'size' | 'width'> {
  lines?: number;
  lineHeight?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl';
  lastLineWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      className,
      lines = 1,
      lineHeight = 'default',
      lastLineWidth = 'xl',
      variant,
      rounded,
      delay = 0,
      ...props
    },
    ref
  ) => {
    const lineHeightClasses = {
      xs: 'h-2',
      sm: 'h-3',
      default: 'h-4',
      md: 'h-5',
      lg: 'h-6',
      xl: 'h-8',
    };

    const lastLineWidthClasses = {
      xs: 'w-1/4',
      sm: 'w-1/3',
      md: 'w-1/2',
      lg: 'w-2/3',
      xl: 'w-3/4',
      full: 'w-full',
    };

    const textLines = Array.from({ length: lines }).map((_, index) => {
      const isLast = index === lines - 1;
      const width = isLast ? lastLineWidthClasses[lastLineWidth] : 'w-full';
      const style = {
        animationDelay: `${delay + index * 50}ms`,
      };

      return (
        <Skeleton
          key={index}
          ref={index === 0 ? ref : undefined}
          variant={variant}
          size="default"
          width="full"
          rounded={rounded}
          className={cn(
            lineHeightClasses[lineHeight],
            width,
            index > 0 && 'mt-2',
            className
          )}
          style={style}
          {...props}
        />
      );
    });

    return <>{textLines}</>;
  }
);
SkeletonText.displayName = 'SkeletonText';

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: boolean;
  avatar?: boolean;
  text?: boolean;
  textLines?: number;
  actions?: boolean;
  image?: boolean;
  imageHeight?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      className,
      header = true,
      avatar = true,
      text = true,
      textLines = 3,
      actions = true,
      image = false,
      imageHeight = 'md',
      ...props
    },
    ref
  ) => {
    const imageHeightClasses = {
      sm: 'h-32',
      md: 'h-48',
      lg: 'h-64',
      xl: 'h-80',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card p-6 shadow-sm',
          className
        )}
        {...props}
      >
        {image && (
          <Skeleton
            className={cn(
              'w-full rounded-t-lg',
              imageHeightClasses[imageHeight]
            )}
          />
        )}
        <div className={cn(image && 'mt-4')}>
          {header && (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {avatar && <SkeletonAvatar size="md" />}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          )}
          {text && (
            <div className="mt-4">
              <SkeletonText lines={textLines} lineHeight="default" />
            </div>
          )}
          {actions && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          )}
        </div>
      </div>
    );
  }
);
SkeletonCard.displayName = 'SkeletonCard';

interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number;
  avatar?: boolean;
  text?: boolean;
  textLines?: number;
  actions?: boolean;
  className?: string;
}

const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  (
    {
      className,
      items = 5,
      avatar = true,
      text = true,
      textLines = 2,
      actions = false,
      ...props
    },
    ref
  ) => {
    const listItems = Array.from({ length: items }).map((_, index) => (
      <div
        key={index}
        className={cn(
          'flex items-center gap-4 py-3',
          index < items - 1 && 'border-b'
        )}
      >
        {avatar && <SkeletonAvatar size="sm" />}
        {text && (
          <div className="flex-1">
            <SkeletonText lines={textLines} lineHeight="sm" lastLineWidth="lg" />
          </div>
        )}
        {actions && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        )}
      </div>
    ));

    return (
      <div ref={ref} className={cn('space-y-0', className)} {...props}>
        {listItems}
      </div>
    );
  }
);
SkeletonList.displayName = 'SkeletonList';

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  skeletonVariants,
};