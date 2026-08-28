import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { User } from 'lucide-react';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        md: 'h-12 w-12',
        lg: 'h-14 w-14',
        xl: 'h-16 w-16',
        '2xl': 'h-20 w-20',
        '3xl': 'h-24 w-24',
        '4xl': 'h-32 w-32',
      },
      border: {
        none: '',
        default: 'ring-2 ring-background',
        primary: 'ring-2 ring-primary',
        secondary: 'ring-2 ring-secondary',
        success: 'ring-2 ring-success',
        warning: 'ring-2 ring-warning',
        destructive: 'ring-2 ring-destructive',
      },
      status: {
        online: 'ring-2 ring-green-500',
        offline: 'ring-2 ring-gray-400',
        busy: 'ring-2 ring-red-500',
        away: 'ring-2 ring-yellow-500',
        none: '',
      },
    },
    defaultVariants: {
      size: 'default',
      border: 'none',
      status: 'none',
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  children?: React.ReactNode;
  statusIndicator?: 'online' | 'offline' | 'busy' | 'away' | 'none';
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(
  (
    {
      className,
      size,
      border,
      status,
      src,
      alt,
      fallback,
      children,
      statusIndicator = 'none',
      statusPosition = 'bottom-right',
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);

    const getStatusPositionClasses = () => {
      switch (statusPosition) {
        case 'top-right':
          return 'top-0 right-0 -translate-y-1/4 translate-x-1/4';
        case 'bottom-right':
          return 'bottom-0 right-0 translate-y-1/4 translate-x-1/4';
        case 'top-left':
          return 'top-0 left-0 -translate-y-1/4 -translate-x-1/4';
        case 'bottom-left':
          return 'bottom-0 left-0 translate-y-1/4 -translate-x-1/4';
        default:
          return 'bottom-0 right-0 translate-y-1/4 translate-x-1/4';
      }
    };

    const getStatusSize = () => {
      switch (size) {
        case 'xs':
          return 'h-2 w-2';
        case 'sm':
          return 'h-2.5 w-2.5';
        case 'default':
        case 'md':
          return 'h-3 w-3';
        case 'lg':
          return 'h-3.5 w-3.5';
        case 'xl':
          return 'h-4 w-4';
        case '2xl':
          return 'h-5 w-5';
        case '3xl':
          return 'h-6 w-6';
        case '4xl':
          return 'h-8 w-8';
        default:
          return 'h-3 w-3';
      }
    };

    const getStatusColor = () => {
      switch (statusIndicator) {
        case 'online':
          return 'bg-green-500';
        case 'offline':
          return 'bg-gray-400';
        case 'busy':
          return 'bg-red-500';
        case 'away':
          return 'bg-yellow-500';
        default:
          return '';
      }
    };

    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size, border, status, className }))}
        {...props}
      >
        {src && !imageError ? (
          <AvatarPrimitive.Image
            src={src}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <AvatarPrimitive.Fallback
            className={cn(
              'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
              size === 'xs' && 'text-xs',
              size === 'sm' && 'text-sm',
              size === 'default' && 'text-base',
              size === 'md' && 'text-lg',
              size === 'lg' && 'text-xl',
              size === 'xl' && 'text-2xl',
              size === '2xl' && 'text-3xl',
              size === '3xl' && 'text-4xl',
              size === '4xl' && 'text-5xl'
            )}
          >
            {children || fallback ? (
              <span>{children || fallback}</span>
            ) : (
              <User className="h-1/2 w-1/2" />
            )}
          </AvatarPrimitive.Fallback>
        )}
        {statusIndicator !== 'none' && (
          <span
            className={cn(
              'absolute rounded-full border-2 border-background',
              getStatusPositionClasses(),
              getStatusSize(),
              getStatusColor(),
              'ring-2 ring-background'
            )}
          />
        )}
      </AvatarPrimitive.Root>
    );
  }
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
  spacing?: 'sm' | 'md' | 'lg';
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 5, spacing = 'md', size = 'default', className, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const totalChildren = childrenArray.length;
    const visibleChildren = childrenArray.slice(0, max);
    const remainingCount = totalChildren - max;

    const spacingClasses = {
      sm: '-space-x-2',
      md: '-space-x-3',
      lg: '-space-x-4',
    };

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
      <div
        ref={ref}
        className={cn('flex items-center', spacingClasses[spacing], className)}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div
            key={index}
            className={cn(
              'rounded-full ring-2 ring-background',
              sizeClasses[size]
            )}
          >
            {child}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background',
              sizeClasses[size]
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, avatarVariants };