import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: '',
        primary: 'border-primary/20 bg-primary/5',
        secondary: 'border-secondary/20 bg-secondary/5',
        success: 'border-success/20 bg-success/5',
        warning: 'border-warning/20 bg-warning/5',
        destructive: 'border-destructive/20 bg-destructive/5',
        info: 'border-info/20 bg-info/5',
        ghost: 'border-transparent bg-transparent shadow-none',
        outline: 'border-2',
        elevated: 'shadow-lg hover:shadow-xl transition-shadow duration-200',
      },
      hoverable: {
        true: 'hover:shadow-lg transition-all duration-200 hover:-translate-y-1',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode;
  actions?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      hoverable,
      padding,
      asChild = false,
      children,
      header,
      footer,
      title,
      description,
      content,
      actions,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, hoverable, padding, className }))}
        {...props}
      >
        {header && (
          <div className={cn(
            'border-b pb-4',
            padding === 'default' && 'mb-4',
            padding === 'lg' && 'mb-6',
            padding === 'xl' && 'mb-8'
          )}>
            {header}
          </div>
        )}
        {title && (
          <CardTitle className="mb-2">{title}</CardTitle>
        )}
        {description && (
          <CardDescription className="mb-4">{description}</CardDescription>
        )}
        {content ? content : children}
        {actions && (
          <div className={cn(
            'mt-4 flex items-center gap-2',
            padding === 'default' && 'mt-6',
            padding === 'lg' && 'mt-8',
            padding === 'xl' && 'mt-10'
          )}>
            {actions}
          </div>
        )}
        {footer && (
          <div className={cn(
            'border-t pt-4 mt-4',
            padding === 'default' && 'mt-6',
            padding === 'lg' && 'mt-8',
            padding === 'xl' && 'mt-10'
          )}>
            {footer}
          </div>
        )}
      </Comp>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const CardGrid = React.forwardRef<HTMLDivElement, CardGridProps>(
  ({ className, cols = 3, gap = 'md', children, ...props }, ref) => {
    const colsClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    };

    const gapClasses = {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    return (
      <div
        ref={ref}
        className={cn('grid', colsClasses[cols], gapClasses[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardGrid.displayName = 'CardGrid';

interface CardStackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg';
}

const CardStack = React.forwardRef<HTMLDivElement, CardStackProps>(
  ({ className, children, direction = 'vertical', gap = 'md', ...props }, ref) => {
    const directionClasses = {
      vertical: 'flex-col',
      horizontal: 'flex-row overflow-x-auto',
    };

    const gapClasses = {
      sm: direction === 'vertical' ? 'space-y-2' : 'space-x-2',
      md: direction === 'vertical' ? 'space-y-4' : 'space-x-4',
      lg: direction === 'vertical' ? 'space-y-6' : 'space-x-6',
    };

    return (
      <div
        ref={ref}
        className={cn('flex', directionClasses[direction], className)}
        {...props}
      >
        {React.Children.map(children, (child, index) => (
          <div key={index} className={gapClasses[gap]}>
            {child}
          </div>
        ))}
      </div>
    );
  }
);
CardStack.displayName = 'CardStack';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardGrid,
  CardStack,
  cardVariants,
};