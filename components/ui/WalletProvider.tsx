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
  const [publicKey, setPublicKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wallet_publicKey');
    }
    return null;
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wallet_address');
    }
    return null;
  });
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wallet_connected') === 'true';
    }
    return false;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallet, setWallet] = useState<PhantomProvider | null>(null);

  // Persist wallet state to localStorage
  const persistWalletState = (publicKey: string | null, address: string | null, connected: boolean) => {
    if (typeof window !== 'undefined') {
      if (publicKey) {
        localStorage.setItem('wallet_publicKey', publicKey);
      } else {
        localStorage.removeItem('wallet_publicKey');
      }
      if (address) {
        localStorage.setItem('wallet_address', address);
      } else {
        localStorage.removeItem('wallet_address');
      }
      localStorage.setItem('wallet_connected', connected.toString());
    }
  };

  // Clear persisted wallet state
  const clearPersistedWalletState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wallet_publicKey');
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_connected');
    }
  };

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
      
      // Persist wallet state
      persistWalletState(publicKeyString, address, true);
      
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
      
      // Clear persisted wallet state
      clearPersistedWalletState();
      
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
      
      // Check if already connected or if we have persisted state
      if (provider.publicKey || (isConnected && walletAddress)) {
        if (provider.publicKey) {
          const publicKeyBytes = provider.publicKey.toBytes();
          const publicKeyString = Buffer.from(publicKeyBytes).toString('hex');
          const address = publicKeyToAddress(publicKeyBytes);
          setPublicKey(publicKeyString);
          setWalletAddress(address);
          setIsConnected(true);
          persistWalletState(publicKeyString, address, true);
        } else if (isConnected && walletAddress) {
          // We have persisted state but no active connection, try to reconnect
          console.log('Attempting to restore wallet connection...');
          // Don't auto-reconnect, let user manually reconnect if needed
          setIsConnected(false);
          clearPersistedWalletState();
        }
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
          persistWalletState(publicKeyString, address, true);
        } else {
          setPublicKey(null);
          setWalletAddress(null);
          setIsConnected(false);
          clearPersistedWalletState();
        }
      };

      // Listen for disconnect
      const handleDisconnect = () => {
        setPublicKey(null);
        setWalletAddress(null);
        setIsConnected(false);
        clearPersistedWalletState();
      };

      provider.on('accountChanged', handleAccountChanged);
      provider.on('disconnect', handleDisconnect);

      return () => {
        // Remove event listeners if the provider supports it
        if (provider && typeof (provider as any).removeListener === 'function') {
          (provider as any).removeListener('accountChanged', handleAccountChanged);
          (provider as any).removeListener('disconnect', handleDisconnect);
        }
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
