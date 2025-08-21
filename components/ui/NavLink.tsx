import React from 'react';
import Link from 'next/link';
import { NavLinkProps } from '@/types';

const NavLink: React.FC<NavLinkProps> = ({
  href,
  children,
  isActive = false,
}) => {
  const baseClasses = 'px-3 py-2 font-medium transition-all duration-200 focus:outline-none focus:ring-0 focus:outline-0 relative';
  
  const activeClasses = isActive 
    ? 'text-primary-mint' 
    : 'text-text-secondary';

  return (
    <Link
      href={href}
      className={`${baseClasses} ${activeClasses}`}
      tabIndex={0}
      role="link"
      aria-current={isActive ? 'page' : undefined}
      style={{ outline: 'none' }}
      prefetch
    >
      {children}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-mint to-primary-aqua rounded-full"></div>
      )}
    </Link>
  );
};

export default NavLink;
