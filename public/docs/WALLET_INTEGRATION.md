# Phantom Wallet Integration Guide

## Overview

This document explains how Phantom wallet integration works in the SplitzFun application and what components are needed for a complete implementation.

## How Phantom Wallet Connection Works

### 1. **Browser Injection**
When a user has Phantom wallet installed, it injects a `window.solana` object into the browser. This object provides the interface for connecting to the wallet.

### 2. **Connection Flow**
```
User clicks "Connect Wallet" 
    ↓
Check if Phantom is installed (window.solana)
    ↓
Call window.solana.connect()
    ↓
Phantom shows popup for user approval
    ↓
User approves → Get public key
User rejects → Handle error
    ↓
Store connection state and public key
    ↓
Listen for wallet events (disconnect, account change)
```

### 3. **Key Components Implemented**

#### A. **WalletProvider** (`components/ui/WalletProvider.tsx`)
- **Purpose**: Context provider that manages wallet state across the app
- **Features**:
  - Detects if Phantom is installed
  - Handles connection/disconnection
  - Manages wallet state (connected, connecting, public key)
  - Listens for wallet events
  - Provides wallet context to all components

#### B. **ConnectWalletButton** (`components/ui/ConnectWalletButton.tsx`)
- **Purpose**: Reusable button component for wallet connection
- **Features**:
  - Shows different states (connect, connecting, connected)
  - Displays truncated public key when connected
  - Handles connection errors with user feedback
  - Supports different variants and sizes

#### C. **Type Definitions** (`types/index.ts`)
- **WalletContextState**: Interface for wallet context
- **PhantomProvider**: TypeScript types for Phantom wallet
- **Global Window Interface**: Extends window object with solana property

## Required Dependencies

```json
{
  "@solana/web3.js": "^1.87.6",
  "@solana/wallet-adapter-base": "^0.9.23",
  "@solana/wallet-adapter-react": "^0.15.35",
  "@solana/wallet-adapter-react-ui": "^0.9.34",
  "@solana/wallet-adapter-wallets": "^0.19.23"
}
```

## Integration Steps

### 1. **Install Dependencies**
```bash
npm install @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### 2. **Wrap App with WalletProvider**
```tsx
// app/layout.tsx
import { WalletProvider } from '@/components/ui/WalletProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
```

### 3. **Use Wallet Hook in Components**
```tsx
import { useWallet } from '@/components/ui/WalletProvider'

const MyComponent = () => {
  const { isConnected, publicKey, connect, disconnect } = useWallet()
  
  // Use wallet state and functions
}
```

### 4. **Use ConnectWalletButton**
```tsx
import ConnectWalletButton from '@/components/ui/ConnectWalletButton'

<ConnectWalletButton 
  variant="primary" 
  size="lg" 
  className="px-8" 
/>
```

## Wallet Events Handled

### 1. **accountChanged**
- Triggered when user switches accounts in Phantom
- Updates the stored public key
- Maintains connection state

### 2. **disconnect**
- Triggered when user disconnects from Phantom
- Clears stored public key
- Updates connection state to false

## Error Handling

The implementation includes comprehensive error handling for:

- **Phantom not installed**: Shows helpful message with installation link
- **Connection rejected**: User-friendly error message
- **Network errors**: Graceful fallback with retry options
- **Unexpected errors**: Generic error handling with logging

## Security Considerations

### 1. **Public Key Storage**
- Only public keys are stored (never private keys)
- Public keys are safe to display and store
- No sensitive data is persisted

### 2. **Connection Validation**
- Validates Phantom provider before connection
- Checks for proper wallet interface
- Verifies connection response

### 3. **Event Cleanup**
- Properly removes event listeners on unmount
- Prevents memory leaks
- Ensures clean disconnection

## Advanced Features

### 1. **Multi-Wallet Support**
The current implementation can be extended to support multiple wallets:

```tsx
// Future enhancement
const supportedWallets = [
  'phantom',
  'solflare', 
  'slope',
  'backpack'
]
```

### 2. **Transaction Signing**
Once connected, you can sign transactions:

```tsx
const { wallet } = useWallet()

const signTransaction = async (transaction) => {
  if (wallet) {
    const signed = await wallet.signTransaction(transaction)
    return signed
  }
}
```

### 3. **Message Signing**
Sign messages for authentication:

```tsx
const signMessage = async (message) => {
  if (wallet) {
    const signature = await wallet.signMessage(message)
    return signature
  }
}
```

## Testing

### 1. **Development Testing**
- Install Phantom wallet extension
- Test connection flow
- Test disconnection
- Test account switching
- Test error scenarios

### 2. **Production Considerations**
- Test on different browsers
- Test with different Phantom versions
- Test network connectivity issues
- Test mobile wallet connections

## Troubleshooting

### Common Issues

1. **"Phantom wallet is not installed"**
   - User needs to install Phantom from https://phantom.app/
   - Provide clear installation instructions

2. **Connection fails**
   - Check if user rejected the connection
   - Verify network connectivity
   - Check browser console for errors

3. **Public key not updating**
   - Verify event listeners are properly set up
   - Check for proper cleanup on component unmount

### Debug Mode
Enable debug logging by setting:
```tsx
const DEBUG = process.env.NODE_ENV === 'development'
```

## Future Enhancements

1. **Wallet Persistence**: Remember connected wallet across sessions
2. **Multi-Wallet Support**: Support for Solflare, Slope, etc.
3. **Transaction History**: Track and display transaction history
4. **Balance Display**: Show SOL and token balances
5. **Network Switching**: Support for devnet/testnet switching

## Resources

- [Phantom Wallet Documentation](https://docs.phantom.app/)
- [Solana Web3.js Documentation](https://docs.solana.com/developing/clients/javascript-api)
- [Wallet Adapter Documentation](https://github.com/solana-labs/wallet-adapter)
