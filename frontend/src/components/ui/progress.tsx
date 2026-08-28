import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const progressVariants = cva(
  'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      variant: {
        default: 'bg-secondary',
        primary: 'bg-primary/20',
        success: 'bg-success/20',
        warning: 'bg-warning/20',
        destructive: 'bg-destructive/20',
        info: 'bg-info/20',
        gradient: 'bg-gradient-to-r from-primary/20 via-success/20 to-primary/20',
      },
      size: {
        xs: 'h-1',
        sm: 'h-2',
        default: 'h-4',
        md: 'h-6',
        lg: 'h-8',
        xl: 'h-10',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        default: 'rounded-full',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
);

const indicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-500 ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        primary: 'bg-primary',
        success: 'bg-success',
        warning: 'bg-warning',
        destructive: 'bg-destructive',
        info: 'bg-info',
        gradient: 'bg-gradient-to-r from-primary via-success to-primary bg-[length:200%] animate-shimmer',
      },
      striped: {
        true: 'bg-stripes',
      },
      animated: {
        true: 'transition-all duration-1000 ease-in-out',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorClassName?: string;
  value?: number;
  max?: number;
  showValue?: boolean;
  valueFormat?: (value: number, max: number) => string;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'inside' | 'none';
  showPercentage?: boolean;
  showStatus?: boolean;
  status?: 'success' | 'warning' | 'error' | 'info' | 'none';
  animated?: boolean;
  striped?: boolean;
  buffer?: number;
  bufferColor?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      variant,
      size,
      rounded,
      indicatorClassName,
      value = 0,
      max = 100,
      showValue = false,
      valueFormat,
      label,
      labelPosition = 'top',
      showPercentage = true,
      showStatus = false,
      status = 'none',
      animated = false,
      striped = false,
      buffer,
      bufferColor,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const bufferPercentage = buffer ? Math.min(Math.max((buffer / max) * 100, 0), 100) : 0;
    
    const getStatusIcon = () => {
      switch (status) {
        case 'success':
          return <CheckCircle className="h-4 w-4 text-success" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4 text-warning" />;
        case 'error':
          return <AlertCircle className="h-4 w-4 text-destructive" />;
        case 'info':
          return <Info className="h-4 w-4 text-info" />;
        default:
          return null;
      }
    };

    const getStatusColor = () => {
      switch (status) {
        case 'success':
          return 'text-success';
        case 'warning':
          return 'text-warning';
        case 'error':
          return 'text-destructive';
        case 'info':
          return 'text-info';
        default:
          return '';
      }
    };

    const getVariantFromStatus = () => {
      switch (status) {
        case 'success':
          return 'success';
        case 'warning':
          return 'warning';
        case 'error':
          return 'destructive';
        case 'info':
          return 'info';
        default:
          return variant || 'default';
      }
    };

    const formatValue = (val: number, maxVal: number): string => {
      if (valueFormat) {
        return valueFormat(val, maxVal);
      }
      if (showPercentage) {
        return `${Math.round((val / maxVal) * 100)}%`;
      }
      return `${val}/${maxVal}`;
    };

    const showLabel = label && labelPosition !== 'none';
    const showValueLabel = showValue && labelPosition !== 'none';
    const showStatusIcon = showStatus && status !== 'none';

    const content = (
      <>
        {buffer !== undefined && bufferPercentage > 0 && (
          <div
            className="absolute h-full rounded-full bg-muted-foreground/10 transition-all duration-500"
            style={{
              width: `${bufferPercentage}%`,
              backgroundColor: bufferColor,
            }}
          />
        )}
        <ProgressPrimitive.Indicator
          className={cn(
            indicatorVariants({
              variant: getVariantFromStatus(),
              striped,
              animated,
            }),
            indicatorClassName,
            `translate-x-[-${100 - percentage}%]`
          )}
          style={{
            transform: `translateX(-${100 - percentage}%)`,
          }}
        />
      </>
    );

    if (showLabel || showValueLabel || showStatusIcon) {
      return (
        <div className="space-y-1.5 w-full">
          {(labelPosition === 'top') && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {label && <span>{label}</span>}
                {showStatusIcon && (
                  <span className={getStatusColor()}>
                    {getStatusIcon()}
                  </span>
                )}
              </div>
              {showValueLabel && (
                <span className="text-muted-foreground">
                  {formatValue(value, max)}
                </span>
              )}
            </div>
          )}
          <ProgressPrimitive.Root
            ref={ref}
            className={cn(progressVariants({ variant, size, rounded, className }))}
            value={percentage}
            {...props}
          >
            {content}
          </ProgressPrimitive.Root>
          {(labelPosition === 'bottom') && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {label && <span>{label}</span>}
                {showStatusIcon && (
                  <span className={getStatusColor()}>
                    {getStatusIcon()}
                  </span>
                )}
              </div>
              {showValueLabel && (
                <span className="text-muted-foreground">
                  {formatValue(value, max)}
                </span>
              )}
            </div>
          )}
          {(labelPosition === 'inside') && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
              {formatValue(value, max)}
            </div>
          )}
        </div>
      );
    }

    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant, size, rounded, className }))}
        value={percentage}
        {...props}
      >
        {content}
      </ProgressPrimitive.Root>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'default' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'gradient';
  showValue?: boolean;
  valueFormat?: (value: number, max: number) => string;
  children?: React.ReactNode;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 'default',
      strokeWidth = 8,
      variant = 'default',
      showValue = true,
      valueFormat,
      children,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const sizeClasses = {
      sm: 'h-12 w-12',
      default: 'h-16 w-16',
      md: 'h-20 w-20',
      lg: 'h-24 w-24',
      xl: 'h-32 w-32',
    };

    const colorClasses = {
      default: 'stroke-primary',
      primary: 'stroke-primary',
      success: 'stroke-success',
      warning: 'stroke-warning',
      destructive: 'stroke-destructive',
      info: 'stroke-info',
      gradient: 'stroke-primary',
    };

    const formatValue = (val: number, maxVal: number): string => {
      if (valueFormat) {
        return valueFormat(val, maxVal);
      }
      return `${Math.round((val / maxVal) * 100)}%`;
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <svg className="h-full w-full -rotate-90">
          <circle
            className="stroke-muted"
            cx="50%"
            cy="50%"
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            className={cn(
              'transition-all duration-500 ease-in-out',
              colorClasses[variant]
            )}
            cx="50%"
            cy="50%"
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium">
              {formatValue(value, max)}
            </span>
          </div>
        )}
        {children}
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

interface ProgressGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  items: Array<{
    label: string;
    value: number;
    max?: number;
    variant?: ProgressProps['variant'];
    color?: string;
  }>;
  showValues?: boolean;
  valueFormat?: (value: number, max: number) => string;
}

const ProgressGroup = React.forwardRef<HTMLDivElement, ProgressGroupProps>(
  (
    {
      className,
      items,
      showValues = true,
      valueFormat,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {items.map((item, index) => (
          <Progress
            key={index}
            value={item.value}
            max={item.max || 100}
            variant={item.variant || 'default'}
            label={item.label}
            showValue={showValues}
            valueFormat={valueFormat}
            className={item.color ? `[&>div]:bg-[${item.color}]` : undefined}
          />
        ))}
      </div>
    );
  }
);
ProgressGroup.displayName = 'ProgressGroup';

export {
  Progress,
  CircularProgress,
  ProgressGroup,
  progressVariants,
  indicatorVariants,
};