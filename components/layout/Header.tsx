'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search, Wallet, Plus } from 'lucide-react';
import NavLink from '../ui/NavLink';
import SearchBar from '../ui/SearchBar';
import Modal from '../ui/Modal';
import ConnectWalletButton from '../ui/ConnectWalletButton';

interface HeaderProps {
  currentPath: string;
}

const Header: React.FC<HeaderProps> = ({ currentPath }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  const handleSearch = (query: string) => {
    alert(`Search query: ${query} (This is a stub)`);
    setIsSearchOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/explore', label: 'Explore' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/docs', label: 'Docs' },
  ];

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background-dark/95 backdrop-blur-sm border-b border-background-elevated' : 'bg-background-dark'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center" style={{ outline: 'none' }}>
                {/* Mobile: Circle logo */}
                <img 
                  src="/circle-logo.png" 
                  alt="SplitzFun" 
                  className="w-8 h-8 md:hidden"
                />
                {/* Desktop: Long logo */}
                <img 
                  src="/long-logo.png" 
                  alt="SplitzFun" 
                  className="hidden md:block h-8"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  isActive={currentPath === link.href}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <Link
                href="/create"
                className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none"
                style={{ outline: 'none' }}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create coin
              </Link>
              <ConnectWalletButton variant="secondary" size="md" />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-background-elevated">
              <div className="space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block text-sm font-medium transition-colors duration-200 ${
                      currentPath === link.href
                        ? 'text-primary-mint'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                    style={{ outline: 'none' }}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 space-y-3">
                  <Link
                    href="/create"
                    className="w-full bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none text-center block"
                    onClick={() => setIsMenuOpen(false)}
                    style={{ outline: 'none' }}
                  >
                    Create coin
                  </Link>
                  <ConnectWalletButton variant="secondary" size="md" className="w-full" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Faint grey line at bottom */}
        <div className="h-px bg-background-elevated/50"></div>
      </header>
      
      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Search">
        <SearchBar onSearch={handleSearch} />
      </Modal>
    </>
  );
};

export default Header;
