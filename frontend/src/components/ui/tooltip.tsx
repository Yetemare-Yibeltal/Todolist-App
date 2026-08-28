import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const tooltipContentVariants = cva(
  'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      variant: {
        default: 'bg-popover text-popover-foreground',
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        info: 'bg-info text-info-foreground',
        dark: 'bg-gray-900 text-gray-50 dark:bg-gray-50 dark:text-gray-900',
      },
      size: {
        default: 'px-3 py-1.5 text-sm',
        sm: 'px-2 py-1 text-xs',
        lg: 'px-4 py-2 text-base',
        xl: 'px-5 py-3 text-lg',
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
      rounded: 'default',
    },
  }
);

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  sideOffset?: number;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionPadding?: number;
  arrow?: boolean;
  arrowClassName?: string;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(
  (
    {
      className,
      variant,
      size,
      rounded,
      sideOffset = 4,
      alignOffset = 0,
      avoidCollisions = true,
      collisionPadding = 8,
      arrow = true,
      arrowClassName,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          avoidCollisions={avoidCollisions}
          collisionPadding={collisionPadding}
          className={cn(tooltipContentVariants({ variant, size, rounded, className }))}
          {...props}
        >
          {children}
          {arrow && (
            <TooltipPrimitive.Arrow
              className={cn(
                'fill-popover',
                variant === 'primary' && 'fill-primary',
                variant === 'secondary' && 'fill-secondary',
                variant === 'success' && 'fill-success',
                variant === 'warning' && 'fill-warning',
                variant === 'destructive' && 'fill-destructive',
                variant === 'info' && 'fill-info',
                variant === 'dark' && 'fill-gray-900 dark:fill-gray-50',
                arrowClassName
              )}
            />
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  }
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
  contentClassName?: string;
  variant?: TooltipContentProps['variant'];
  size?: TooltipContentProps['size'];
  rounded?: TooltipContentProps['rounded'];
  sideOffset?: number;
  alignOffset?: number;
  arrow?: boolean;
  arrowClassName?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      children,
      side = 'top',
      align = 'center',
      delayDuration = 200,
      skipDelayDuration = 300,
      disableHoverableContent = false,
      contentClassName,
      variant,
      size,
      rounded,
      sideOffset = 4,
      alignOffset = 0,
      arrow = true,
      arrowClassName,
      open,
      defaultOpen,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    return (
      <TooltipProvider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        disableHoverableContent={disableHoverableContent}
      >
        <TooltipRoot
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          {...props}
        >
          <TooltipTrigger asChild>
            <span ref={ref} className="inline-block">
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side={side}
            align={align}
            variant={variant}
            size={size}
            rounded={rounded}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            arrow={arrow}
            arrowClassName={arrowClassName}
            className={contentClassName}
          >
            {content}
          </TooltipContent>
        </TooltipRoot>
      </TooltipProvider>
    );
  }
);
Tooltip.displayName = 'Tooltip';

interface TooltipIconProps extends Omit<TooltipProps, 'content' | 'children'> {
  icon: React.ReactNode;
  label: string;
  iconClassName?: string;
}

const TooltipIcon = React.forwardRef<HTMLDivElement, TooltipIconProps>(
  ({ icon, label, iconClassName, ...props }, ref) => {
    return (
      <Tooltip content={label} {...props}>
        <span ref={ref} className={cn('inline-flex', iconClassName)}>
          {icon}
        </span>
      </Tooltip>
    );
  }
);
TooltipIcon.displayName = 'TooltipIcon';

interface TooltipGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
  wrap?: boolean;
}

const TooltipGroup = React.forwardRef<HTMLDivElement, TooltipGroupProps>(
  ({ className, children, spacing = 'md', wrap = true, ...props }, ref) => {
    const spacingClasses = {
      sm: 'gap-1',
      md: 'gap-2',
      lg: 'gap-3',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          wrap && 'flex-wrap',
          spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TooltipGroup.displayName = 'TooltipGroup';

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipIcon,
  TooltipGroup,
  tooltipContentVariants,
};