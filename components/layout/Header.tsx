'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search, Wallet, Plus } from 'lucide-react';
import NavLink from '../ui/NavLink';
import SearchBar from '../ui/SearchBar';
import Modal from '../ui/Modal';
import ConnectWalletButton from '../ui/ConnectWalletButton';
import NotificationCenter from '../ui/NotificationCenter';
import { useWallet } from '../ui/WalletProvider';

interface HeaderProps {
  currentPath: string;
}

const Header: React.FC<HeaderProps> = ({ currentPath }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { publicKey, isConnected } = useWallet();

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

  const formatWalletAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 min-w-0 relative">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center" style={{ outline: 'none' }}>
                {/* Mobile: Circle logo */}
                <img 
                  src="/circle-logo.png" 
                  alt="SplitzFun" 
                  className="w-10 h-10 md:hidden"
                />
                {/* Desktop: Long logo */}
                <img 
                  src="/long-logo.png" 
                  alt="SplitzFun" 
                  className="hidden md:block h-8"
                />
              </Link>
            </div>

            {/* Desktop Navigation - Centered on screen */}
            <nav className="hidden xl:flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
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
            <div className="hidden xl:flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="h-10 px-3 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              
              {/* Notification Center - Only show when connected */}
              {isConnected && (
                <NotificationCenter 
                  userId={publicKey?.toString() || ''} 
                  className="h-10 px-3 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                />
              )}
              
              <Link
                href="/create"
                className="h-10 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none flex items-center justify-center"
                style={{ outline: 'none' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create coin
              </Link>
              <ConnectWalletButton variant="secondary" size="md" className="h-10" />
            </div>

            {/* Medium screen actions (tablet) */}
            <div className="hidden md:flex xl:hidden items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="h-10 px-3 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              
              {/* Notification Center - Only show when connected */}
              {isConnected && (
                <NotificationCenter 
                  userId={publicKey?.toString() || ''} 
                  className="h-10 px-3 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                />
              )}
              
              <Link
                href="/create"
                className="h-10 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-3 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none flex items-center justify-center text-sm"
                style={{ outline: 'none' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Link>
              <ConnectWalletButton variant="secondary" size="md" className="h-10" />
              {/* Hamburger menu for medium screens */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="h-10 w-10 rounded-lg bg-background-elevated text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Mobile actions */}
            <div className="md:hidden flex items-center space-x-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="h-10 w-10 rounded-lg bg-background-elevated text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              
              {/* Notification Center - Only show when connected */}
              {isConnected && (
                <NotificationCenter 
                  userId={publicKey?.toString() || ''} 
                  className="h-10 w-10 rounded-lg bg-background-elevated text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                />
              )}
              
              <Link
                href="/create"
                className="h-10 w-10 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none flex items-center justify-center"
                style={{ outline: 'none' }}
                aria-label="Create coin"
              >
                <Plus className="w-5 h-5" />
              </Link>
              <ConnectWalletButton variant="secondary" size="md" className="h-10" />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="h-10 w-10 rounded-lg bg-background-elevated text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint flex items-center justify-center"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile/Medium Navigation */}
          {isMenuOpen && (
            <div className="xl:hidden py-4 border-t border-background-elevated">
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
