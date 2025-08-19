import React from 'react';
import { NavLinkProps } from '@/types';

const NavLink: React.FC<NavLinkProps> = ({
  href,
  children,
  isActive = false,
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-mint focus:ring-offset-2 focus:ring-offset-background-dark';
  
  const activeClasses = isActive 
    ? 'bg-background-elevated text-primary-mint border border-primary-mint/30' 
    : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated';

  return (
    <a
      href={href}
      className={`${baseClasses} ${activeClasses}`}
      tabIndex={0}
      role="link"
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </a>
  );
};

export default NavLink;
