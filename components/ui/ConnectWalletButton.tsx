'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, LogOut, ChevronDown, User, FolderOpen } from 'lucide-react';
import { useWallet } from './WalletProvider';
import Modal from './Modal';

interface ConnectWalletButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
}) => {
  const { publicKey, isConnected, isConnecting, connect, disconnect } = useWallet();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Note: We intentionally avoid local mounted gating here to prevent
  // flicker of the wallet button state during client-side navigations.

  // Auto-dismiss error after 3 seconds with fade animation
  useEffect(() => {
    if (error) {
      setIsErrorVisible(true);
      const timer = setTimeout(() => {
        setIsErrorVisible(false);
        // Clear error after fade animation completes
        setTimeout(() => setError(null), 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleConnect = async () => {
    try {
      setError(null);
      setShowConnectModal(true);
      await connect();
      setShowConnectModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      setShowConnectModal(false);
      console.error('Wallet connection error:', err);
    }
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleViewProjects = () => {
    setShowDropdown(false);
    router.push('/projects');
  };

  const handleProfile = () => {
    setShowDropdown(false);
    router.push('/profile');
  };

  const handleDisconnectClick = () => {
    setShowDropdown(false);
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async () => {
    try {
      setError(null);
      await disconnect();
      setShowDisconnectModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
      console.error('Wallet disconnection error:', err);
    }
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectModal(false);
  };

  const getButtonClasses = () => {
    const baseClasses = 'flex items-center justify-center space-x-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-mint rounded-lg';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
      primary: 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90',
      secondary: 'bg-background-elevated text-text-primary hover:bg-background-card',
    };

    // If className contains height classes, override the size padding
    const hasHeightClass = className.includes('h-');
    const finalSizeClasses = hasHeightClass ? 'px-4' : sizeClasses[size];

    return `${baseClasses} ${finalSizeClasses} ${variantClasses[variant]} ${className}`;
  };

  const formatWalletAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isConnecting || showConnectModal) {
    return (
      <button className={getButtonClasses()} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Connecting...</span>
      </button>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          className={getButtonClasses()}
          onClick={handleDropdownToggle}
          aria-label="Wallet menu"
        >
          <span>{formatWalletAddress(publicKey)}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-background-card border border-background-elevated rounded-lg shadow-lg z-20 animate-slide-up">
            <div className="py-2">
              <button
                onClick={handleViewProjects}
                className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3 whitespace-nowrap"
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span>View projects</span>
              </button>
              <button
                onClick={handleProfile}
                className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-elevated transition-colors flex items-center space-x-3 whitespace-nowrap"
              >
                <User className="w-4 h-4 flex-shrink-0" />
                <span>Profile</span>
              </button>
              <hr className="border-background-elevated my-1" />
              <button
                onClick={handleDisconnectClick}
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-background-elevated transition-colors flex items-center space-x-3 whitespace-nowrap"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Disconnect Wallet</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Error Popup with fade animation */}
        {error && (
          <div 
            className={`absolute top-full left-0 mt-2 p-2 bg-red-500 text-white text-xs rounded shadow-lg z-10 transition-all duration-300 ${
              isErrorVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            {error}
          </div>
        )}
        
        {/* Disconnect Confirmation Modal */}
        <Modal isOpen={showDisconnectModal} onClose={handleCancelDisconnect} title="Disconnect Wallet">
          <div className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center">
                <LogOut className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Disconnect Wallet?
              </h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to disconnect your wallet? You'll need to sign again when you reconnect.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDisconnect}
                  className="flex-1 px-4 py-2 bg-background-elevated text-text-primary rounded-lg font-medium hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisconnect}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className={getButtonClasses()}
        onClick={handleConnect}
        aria-label="Connect Phantom wallet"
      >
        <Wallet className="w-4 h-4" />
        <span>Connect Wallet</span>
      </button>
      
      {/* Error Popup with fade animation */}
      {error && (
        <div 
          className={`absolute top-full left-0 mt-2 p-2 bg-red-500 text-white text-xs rounded shadow-lg z-10 transition-all duration-300 ${
            isErrorVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default ConnectWalletButton;
