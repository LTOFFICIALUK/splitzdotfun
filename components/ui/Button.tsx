import React from 'react';
import { ButtonProps } from '@/types';

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-mint focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:shadow-lg hover:shadow-primary-mint/25 active:scale-95',
    secondary: 'bg-background-elevated text-text-primary border border-background-elevated hover:bg-background-card hover:border-primary-mint/30',
    ghost: 'bg-transparent text-text-primary hover:bg-background-elevated hover:text-primary-mint',
    outline: 'bg-transparent text-primary-mint border border-primary-mint hover:bg-primary-mint hover:text-background-dark',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};

export default Button;
