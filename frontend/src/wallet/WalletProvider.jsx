import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Transaction } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletContext = createContext(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within <WalletProvider>. Did you forget to wrap the app?');
  }
  return ctx;
}

const endpoint = clusterApiUrl('mainnet-beta');

function WalletBridge({ children }) {
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();
  const [address, setAddress] = useState(null);

  useEffect(() => {
    setAddress(solanaWallet.publicKey? solanaWallet.publicKey.toBase58() : null);
  }, [solanaWallet.publicKey]);

  const signAndSend = useCallback(async (instructions) => {
    if (!solanaWallet.publicKey) throw new Error('Wallet not connected');
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = solanaWallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signed = await solanaWallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }, [solanaWallet, connection]);

  const value = useMemo(() => ({
    ...solanaWallet,
    address,
    connection,
    signAndSend,
  }), [solanaWallet, address, connection, signAndSend]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }) {
  const wallets = useMemo(() => [new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletBridge>{children}</WalletBridge>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
