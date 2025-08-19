'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletContextState, PhantomProvider } from '@/types';

interface WalletProviderProps {
  children: ReactNode;
}

const WalletContext = createContext<WalletContextState | undefined>(undefined);

export const useWallet = (): WalletContextState => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Convert public key bytes to Solana wallet address
const publicKeyToAddress = (publicKeyBytes: Uint8Array): string => {
  // Convert bytes to base58 encoded address
  const base58 = require('bs58');
  return base58.encode(publicKeyBytes);
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallet, setWallet] = useState<PhantomProvider | null>(null);

  // Check if Phantom is installed
  const getProvider = (): PhantomProvider | undefined => {
    if (typeof window !== 'undefined' && 'solana' in window) {
      const provider = window.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    return undefined;
  };

  // Connect to Phantom wallet
  const connect = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      const provider = getProvider();
      
      if (!provider) {
        throw new Error('Phantom wallet is not installed. Please install it from https://phantom.app/');
      }

      // Force disconnect any existing connection
      if (provider.publicKey) {
        try {
          await provider.disconnect();
          // Wait a bit to ensure disconnect is processed
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.log('Disconnect before reconnect failed, continuing...', error);
        }
      }

      // Clear all local state
      setPublicKey(null);
      setWalletAddress(null);
      setIsConnected(false);
      setWallet(null);

      // Force a completely fresh connection by creating a new connection request
      // This should bypass any cached connection state
      const response = await provider.connect();
      
      const publicKeyBytes = response.publicKey.toBytes();
      const publicKeyString = Buffer.from(publicKeyBytes).toString('hex');
      const address = publicKeyToAddress(publicKeyBytes);
      
      setPublicKey(publicKeyString);
      setWalletAddress(address);
      setIsConnected(true);
      setWallet(provider);
      
      console.log('Connected to Phantom wallet:', address);
    } catch (error) {
      console.error('Failed to connect to Phantom wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Phantom wallet
  const disconnect = async (): Promise<void> => {
    try {
      if (wallet) {
        await wallet.disconnect();
      }
      // Clear all wallet state completely
      setPublicKey(null);
      setWalletAddress(null);
      setIsConnected(false);
      setWallet(null);
      console.log('Disconnected from Phantom wallet');
    } catch (error) {
      console.error('Failed to disconnect from Phantom wallet:', error);
      throw error;
    }
  };

  // Initialize wallet connection on mount
  useEffect(() => {
    const provider = getProvider();
    if (provider) {
      setWallet(provider);
      
      // Check if already connected
      if (provider.publicKey) {
        const publicKeyBytes = provider.publicKey.toBytes();
        const publicKeyString = Buffer.from(publicKeyBytes).toString('hex');
        const address = publicKeyToAddress(publicKeyBytes);
        setPublicKey(publicKeyString);
        setWalletAddress(address);
        setIsConnected(true);
      }

      // Listen for account changes
      const handleAccountChanged = (publicKey: any) => {
        if (publicKey) {
          const publicKeyBytes = publicKey.toBytes();
          const publicKeyString = Buffer.from(publicKeyBytes).toString('hex');
          const address = publicKeyToAddress(publicKeyBytes);
          setPublicKey(publicKeyString);
          setWalletAddress(address);
          setIsConnected(true);
        } else {
          setPublicKey(null);
          setWalletAddress(null);
          setIsConnected(false);
        }
      };

      // Listen for disconnect
      const handleDisconnect = () => {
        setPublicKey(null);
        setWalletAddress(null);
        setIsConnected(false);
      };

      provider.on('accountChanged', handleAccountChanged);
      provider.on('disconnect', handleDisconnect);

      return () => {
        provider.removeListener?.('accountChanged', handleAccountChanged);
        provider.removeListener?.('disconnect', handleDisconnect);
      };
    }
  }, []);

  const value: WalletContextState = {
    publicKey: walletAddress, // Return wallet address instead of public key
    isConnected,
    isConnecting,
    connect,
    disconnect,
    wallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
