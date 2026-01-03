import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "py-3.5 px-6 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-lg",
    secondary: "bg-yellow-400 text-primary shadow-lg shadow-yellow-100",
    danger: "bg-destructive text-destructive-foreground",
    outline: "border-2 border-border text-foreground bg-transparent"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
