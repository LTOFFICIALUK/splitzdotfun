import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/components/ui/WalletProvider'

export const metadata: Metadata = {
  title: 'SplitzFun - Clout → Cash. Launch, manage, and flip tokens like startups.',
  description: 'Royalties route through Splitz and get redistributed transparently. Ownership is tradable. Social handles earn.',
  keywords: 'Solana, launchpad, tokens, royalties, crypto, NFT',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-inter antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
