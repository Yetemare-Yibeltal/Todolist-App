import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Search, Eye, EyeOff, X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        ghost: 'border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
        outline: 'border-2',
        filled: 'bg-muted border-transparent',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning',
      },
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-8 px-2 py-1 text-xs',
        lg: 'h-12 px-4 py-3 text-base',
        xl: 'h-14 px-5 py-4 text-lg',
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  success?: boolean;
  warning?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  clearable?: boolean;
  onClear?: () => void;
  showPasswordToggle?: boolean;
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  warningText?: string;
  containerClassName?: string;
  labelClassName?: string;
  helperClassName?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      rounded,
      error,
      success,
      warning,
      icon,
      iconPosition = 'left',
      clearable,
      onClear,
      showPasswordToggle,
      label,
      helperText,
      errorText,
      successText,
      warningText,
      containerClassName,
      labelClassName,
      helperClassName,
      leftAddon,
      rightAddon,
      type = 'text',
      value,
      defaultValue,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(value || defaultValue || '');
    const inputRef = React.useRef<HTMLInputElement>(null);

    const isError = error || !!errorText;
    const isSuccess = success || !!successText;
    const isWarning = warning || !!warningText;

    const getVariant = () => {
      if (isError) return 'error';
      if (isSuccess) return 'success';
      if (isWarning) return 'warning';
      return variant;
    };

    const getHelperText = () => {
      if (isError && errorText) return errorText;
      if (isSuccess && successText) return successText;
      if (isWarning && warningText) return warningText;
      return helperText;
    };

    const getHelperIcon = () => {
      if (isError) return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      if (isSuccess) return <CheckCircle className="h-3.5 w-3.5 text-success" />;
      if (isWarning) return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      return null;
    };

    const getHelperColor = () => {
      if (isError) return 'text-destructive';
      if (isSuccess) return 'text-success';
      if (isWarning) return 'text-warning';
      return 'text-muted-foreground';
    };

    const handleClear = () => {
      setInternalValue('');
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
      }
      if (onClear) onClear();
    };

    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    const renderInput = () => {
      const inputElement = (
        <input
          ref={inputRef}
          type={inputType}
          className={cn(
            inputVariants({ 
              variant: getVariant(), 
              size, 
              rounded, 
              className 
            }),
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            clearable && 'pr-10',
            showPasswordToggle && 'pr-10',
            leftAddon && 'rounded-l-none border-l-0',
            rightAddon && 'rounded-r-none border-r-0',
            isError && 'border-destructive focus-visible:ring-destructive',
            isSuccess && 'border-success focus-visible:ring-success',
            isWarning && 'border-warning focus-visible:ring-warning',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          value={value !== undefined ? value : internalValue}
          defaultValue={defaultValue}
          disabled={disabled}
          {...props}
        />
      );

      if (leftAddon || rightAddon) {
        return (
          <div className="flex w-full">
            {leftAddon && (
              <div className={cn(
                'flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground',
                isError && 'border-destructive',
                isSuccess && 'border-success',
                isWarning && 'border-warning',
                size === 'sm' && 'h-8',
                size === 'default' && 'h-10',
                size === 'lg' && 'h-12',
                size === 'xl' && 'h-14',
                rounded === 'full' && 'rounded-l-full',
                rounded === 'lg' && 'rounded-l-lg',
                rounded === 'xl' && 'rounded-l-xl'
              )}>
                {leftAddon}
              </div>
            )}
            {inputElement}
            {rightAddon && (
              <div className={cn(
                'flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground',
                isError && 'border-destructive',
                isSuccess && 'border-success',
                isWarning && 'border-warning',
                size === 'sm' && 'h-8',
                size === 'default' && 'h-10',
                size === 'lg' && 'h-12',
                size === 'xl' && 'h-14',
                rounded === 'full' && 'rounded-r-full',
                rounded === 'lg' && 'rounded-r-lg',
                rounded === 'xl' && 'rounded-r-xl'
              )}>
                {rightAddon}
              </div>
            )}
          </div>
        );
      }

      return inputElement;
    };

    const renderContent = () => {
      const content = (
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          {renderInput()}
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          {clearable && internalValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      );

      if (label || helperText || errorText || successText || warningText) {
        return (
          <div className="space-y-1.5">
            {label && (
              <label className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                isError && 'text-destructive',
                labelClassName
              )}>
                {label}
                {props.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
            )}
            {content}
            {getHelperText() && (
              <div className={cn('flex items-center gap-1.5 text-xs', getHelperColor(), helperClassName)}>
                {getHelperIcon()}
                <span>{getHelperText()}</span>
              </div>
            )}
          </div>
        );
      }

      return content;
    };

    return (
      <div className={cn('w-full', containerClassName)}>
        {renderContent()}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };