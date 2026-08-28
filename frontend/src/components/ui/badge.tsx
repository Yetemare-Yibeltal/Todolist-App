import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/80',
        outline: 'text-foreground',
        ghost: 'border-transparent bg-transparent hover:bg-accent hover:text-accent-foreground',
        gradient: 'border-transparent bg-gradient-to-r from-primary to-primary/60 text-primary-foreground hover:opacity-80',
      },
      size: {
        default: 'text-xs px-2.5 py-0.5',
        sm: 'text-[10px] px-2 py-0.5',
        lg: 'text-sm px-3 py-1',
        xl: 'text-base px-4 py-1.5',
      },
      rounded: {
        default: 'rounded-full',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        none: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  pulse?: boolean;
  animate?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      rounded,
      asChild = false,
      dismissible,
      onDismiss,
      icon,
      iconPosition = 'left',
      pulse,
      animate,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'div';
    const [isVisible, setIsVisible] = React.useState(true);

    const handleDismiss = () => {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    };

    if (!isVisible) return null;

    const iconMap = {
      success: <Check className="h-3 w-3" />,
      error: <AlertCircle className="h-3 w-3" />,
      info: <Info className="h-3 w-3" />,
      warning: <AlertTriangle className="h-3 w-3" />,
    };

    const getIcon = () => {
      if (icon) return icon;
      if (variant === 'success') return iconMap.success;
      if (variant === 'destructive') return iconMap.error;
      if (variant === 'info') return iconMap.info;
      if (variant === 'warning') return iconMap.warning;
      return null;
    };

    const defaultIcon = getIcon();

    return (
      <Comp
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, rounded, className }),
          pulse && 'animate-pulse',
          animate && 'transition-all duration-200 hover:scale-105',
          dismissible && 'pr-1'
        )}
        {...props}
      >
        {defaultIcon && iconPosition === 'left' && (
          <span className="mr-1">{defaultIcon}</span>
        )}
        {children}
        {defaultIcon && iconPosition === 'right' && (
          <span className="ml-1">{defaultIcon}</span>
        )}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'ml-1 rounded-full hover:bg-background/20 p-0.5 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </Comp>
    );
  }
);
Badge.displayName = 'Badge';

interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const BadgeGroup = React.forwardRef<HTMLDivElement, BadgeGroupProps>(
  ({ className, children, gap = 'sm', wrap = true, align = 'start', ...props }, ref) => {
    const gapClasses = {
      sm: 'gap-1',
      md: 'gap-2',
      lg: 'gap-3',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          wrap && 'flex-wrap',
          gapClasses[gap],
          alignClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BadgeGroup.displayName = 'BadgeGroup';

interface BadgeCounterProps {
  count: number;
  max?: number;
  variant?: BadgeProps['variant'];
  size?: BadgeProps['size'];
  showZero?: boolean;
  className?: string;
}

const BadgeCounter = React.forwardRef<HTMLDivElement, BadgeCounterProps>(
  ({ count, max = 99, variant = 'destructive', size = 'sm', showZero = false, className, ...props }, ref) => {
    if (count === 0 && !showZero) return null;
    
    const displayCount = count > max ? `${max}+` : count;
    
    return (
      <Badge
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          'min-w-[1.5rem] justify-center',
          count > 9 && 'min-w-[2rem]',
          className
        )}
        {...props}
      >
        {displayCount}
      </Badge>
    );
  }
);
BadgeCounter.displayName = 'BadgeCounter';

export { Badge, BadgeGroup, BadgeCounter, badgeVariants };