'use client';

import React from 'react';
import { useWallet } from './WalletProvider';
import { Wallet, Copy, CheckCircle, AlertCircle } from 'lucide-react';

const WalletStatus: React.FC = () => {
  const { isConnected, publicKey, isConnecting } = useWallet();
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  const formatPublicKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  };

  if (isConnecting) {
    return (
      <div className="bg-background-dark border border-background-elevated rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary-mint to-primary-aqua rounded-full flex items-center justify-center animate-pulse">
            <Wallet className="w-4 h-4 text-background-dark" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Connecting to Phantom...</p>
            <p className="text-xs text-text-secondary">Please approve the connection in your wallet</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-background-dark border border-background-elevated rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-background-elevated rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Wallet Not Connected</p>
            <p className="text-xs text-text-secondary">Connect your Phantom wallet to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-dark border border-background-elevated rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-background-dark" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Wallet Connected</p>
            <p className="text-xs text-text-secondary font-mono">
              {formatPublicKey(publicKey || '')}
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyAddress}
          className="p-2 rounded-lg bg-background-elevated text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint"
          aria-label="Copy wallet address"
        >
          {copied ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default WalletStatus;
