import { useContext } from 'react';
import { WalletContext } from './WalletContext.jsx';

/**
 * The single entry point for wallet state anywhere in the app. Never import
 * @solana/wallet-adapter-react directly in a component — go through this
 * hook instead, so there is exactly one wallet instance for the whole app.
 */
export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within <WalletProvider>. Did you forget to wrap the app?');
  }
  return ctx;
}
