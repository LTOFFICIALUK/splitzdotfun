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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallet, setWallet] = useState<PhantomProvider | null>(null);
  const [mounted, setMounted] = useState(false);

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

      // If already connected, just restore the state
      if (provider.publicKey) {
        const publicKeyBytes = provider.publicKey.toBytes();
        const publicKeyString = Buffer.from(publicKeyBytes).toString('hex');
        const address = publicKeyToAddress(publicKeyBytes);
        
        setPublicKey(publicKeyString);
        setWalletAddress(address);
        setIsConnected(true);
        setWallet(provider);
        
        // Persist wallet state
        persistWalletState(publicKeyString, address, true);
        
        console.log('Restored existing Phantom wallet connection:', address);
        return;
      }

      // Connect to wallet
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

  // Sign a transaction with Phantom wallet
  const signTransaction = async (transaction: any): Promise<any> => {
    try {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }
      
      // Sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      return signedTransaction;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  };

  // Sign and send a transaction
  const signAndSendTransaction = async (transaction: any): Promise<string> => {
    try {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }
      
      // Sign and send the transaction
      const signature = await wallet.signAndSendTransaction(transaction);
      return signature.signature;
    } catch (error) {
      console.error('Failed to sign and send transaction:', error);
      throw error;
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
    setMounted(true);
    
    const initializeWallet = async () => {
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
          persistWalletState(publicKeyString, address, true);
        } else if (typeof window !== 'undefined') {
          // Check localStorage for persisted state
          const persistedConnected = localStorage.getItem('wallet_connected') === 'true';
          const persistedAddress = localStorage.getItem('wallet_address');
          
          if (persistedConnected && persistedAddress) {
            // We have persisted state but no active connection, try to auto-reconnect
            console.log('Attempting to restore wallet connection...');
            try {
              await connect();
            } catch (error) {
              console.log('Auto-reconnect failed, clearing persisted state');
              setIsConnected(false);
              clearPersistedWalletState();
            }
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

        // Listen for connect (when user manually connects)
        const handleConnect = (publicKey: any) => {
          if (publicKey) {
            const publicKeyBytes = publicKey.toBytes();
            const publicKeyString = Buffer.from(publicKeyBytes).toString('hex');
            const address = publicKeyToAddress(publicKeyBytes);
            setPublicKey(publicKeyString);
            setWalletAddress(address);
            setIsConnected(true);
            persistWalletState(publicKeyString, address, true);
          }
        };

        provider.on('accountChanged', handleAccountChanged);
        provider.on('disconnect', handleDisconnect);
        provider.on('connect', handleConnect);

        return () => {
          // Remove event listeners if the provider supports it
          if (provider && typeof (provider as any).removeListener === 'function') {
            (provider as any).removeListener('accountChanged', handleAccountChanged);
            (provider as any).removeListener('disconnect', handleDisconnect);
            (provider as any).removeListener('connect', handleConnect);
          }
        };
      }
    };

    initializeWallet();
  }, []);

  const value: WalletContextState = {
    publicKey: walletAddress, // Return wallet address instead of public key
    isConnected: mounted ? isConnected : false, // Only show connected state after mount
    isConnecting,
    connect,
    disconnect,
    signTransaction,
    signAndSendTransaction,
    wallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
