import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const scrollAreaVariants = cva(
  'relative overflow-hidden',
  {
    variants: {
      variant: {
        default: '',
        ghost: 'scrollbar-hide',
        visible: 'scrollbar-visible',
        auto: 'scrollbar-auto',
      },
      size: {
        default: '',
        sm: 'max-h-48',
        md: 'max-h-64',
        lg: 'max-h-96',
        xl: 'max-h-[32rem]',
        '2xl': 'max-h-[48rem]',
        full: 'max-h-full',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
        sm: 'w-48',
        md: 'w-64',
        lg: 'w-80',
        xl: 'w-96',
        '2xl': 'w-128',
        '3xl': 'w-160',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      width: 'full',
    },
  }
);

export interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>,
    VariantProps<typeof scrollAreaVariants> {
  viewportClassName?: string;
  scrollbarClassName?: string;
  thumbClassName?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
  showScrollbars?: boolean;
  scrollHideDelay?: number;
  type?: 'auto' | 'always' | 'scroll' | 'hover';
  dir?: 'ltr' | 'rtl';
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      variant,
      size,
      width,
      viewportClassName,
      scrollbarClassName,
      thumbClassName,
      orientation = 'vertical',
      showScrollbars = true,
      scrollHideDelay = 600,
      type = 'hover',
      dir = 'ltr',
      children,
      ...props
    },
    ref
  ) => {
    const showVertical = orientation === 'vertical' || orientation === 'both';
    const showHorizontal = orientation === 'horizontal' || orientation === 'both';

    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn(scrollAreaVariants({ variant, size, width, className }))}
        type={type}
        scrollHideDelay={scrollHideDelay}
        dir={dir}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          className={cn(
            'h-full w-full rounded-[inherit]',
            variant === 'ghost' && 'scrollbar-hide',
            variant === 'visible' && 'scrollbar-visible',
            viewportClassName
          )}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        {showScrollbars && showVertical && (
          <ScrollAreaPrimitive.Scrollbar
            className={cn(
              'flex touch-none select-none p-0.5 transition-colors duration-200 ease-out',
              'data-[orientation=vertical]:w-2.5',
              'data-[state=hidden]:animate-fade-out',
              'data-[state=visible]:animate-fade-in',
              scrollbarClassName
            )}
            orientation="vertical"
          >
            <ScrollAreaPrimitive.Thumb
              className={cn(
                'relative flex-1 rounded-full bg-muted-foreground/30 transition-colors duration-200',
                'hover:bg-muted-foreground/50',
                thumbClassName
              )}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}
        {showScrollbars && showHorizontal && (
          <ScrollAreaPrimitive.Scrollbar
            className={cn(
              'flex touch-none select-none p-0.5 transition-colors duration-200 ease-out',
              'data-[orientation=horizontal]:h-2.5',
              'data-[state=hidden]:animate-fade-out',
              'data-[state=visible]:animate-fade-in',
              scrollbarClassName
            )}
            orientation="horizontal"
          >
            <ScrollAreaPrimitive.Thumb
              className={cn(
                'relative flex-1 rounded-full bg-muted-foreground/30 transition-colors duration-200',
                'hover:bg-muted-foreground/50',
                thumbClassName
              )}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}
        <ScrollAreaPrimitive.Corner className="bg-transparent" />
      </ScrollAreaPrimitive.Root>
    );
  }
);
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar> {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  thumbClassName?: string;
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Scrollbar>,
  ScrollBarProps
>(({ className, orientation = 'vertical', thumbClassName, ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none p-0.5 transition-colors duration-200 ease-out',
      orientation === 'vertical' && 'h-full w-2.5',
      orientation === 'horizontal' && 'h-2.5 w-full',
      'data-[state=hidden]:animate-fade-out',
      'data-[state=visible]:animate-fade-in',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb
      className={cn(
        'relative flex-1 rounded-full bg-muted-foreground/30 transition-colors duration-200',
        'hover:bg-muted-foreground/50',
        thumbClassName
      )}
    />
  </ScrollAreaPrimitive.Scrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.Scrollbar.displayName;

interface ScrollAreaGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg';
  padding?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const ScrollAreaGroup = React.forwardRef<HTMLDivElement, ScrollAreaGroupProps>(
  (
    {
      className,
      children,
      orientation = 'vertical',
      gap = 'md',
      padding = true,
      align = 'start',
      ...props
    },
    ref
  ) => {
    const orientationClasses = {
      vertical: 'flex-col',
      horizontal: 'flex-row',
    };

    const gapClasses = {
      sm: orientation === 'vertical' ? 'space-y-1' : 'space-x-1',
      md: orientation === 'vertical' ? 'space-y-2' : 'space-x-2',
      lg: orientation === 'vertical' ? 'space-y-3' : 'space-x-3',
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
          orientationClasses[orientation],
          gapClasses[gap],
          alignClasses[align],
          padding && 'p-2',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollAreaGroup.displayName = 'ScrollAreaGroup';

export { ScrollArea, ScrollBar, ScrollAreaGroup, scrollAreaVariants };