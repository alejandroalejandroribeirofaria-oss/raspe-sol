import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  useWalletModal,
} from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  clusterApiUrl,
  Transaction,
  SystemProgram,
  PublicKey,
} from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletContext = createContext(null);

export function useWallet() {
  const ctx = useContext(WalletContext);

  if (!ctx) {
    throw new Error(
      'useWallet must be used within <WalletProvider>.'
    );
  }

  return ctx;
}

const endpoint = clusterApiUrl('mainnet-beta');

function WalletBridge({ children }) {
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [address, setAddress] = useState(null);
  const [balanceLamports, setBalanceLamports] = useState(0);

  useEffect(() => {
    setAddress(
      solanaWallet.publicKey
        ? solanaWallet.publicKey.toBase58()
        : null
    );
  }, [solanaWallet.publicKey]);

  const refreshBalance = useCallback(async () => {
    if (!solanaWallet.publicKey) {
      setBalanceLamports(0);
      return 0;
    }

    const balance = await connection.getBalance(
      solanaWallet.publicKey
    );

    setBalanceLamports(balance);

    return balance;
  }, [connection, solanaWallet.publicKey]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const sendPayment = useCallback(
    async (toWallet, lamports) => {
      if (!solanaWallet.publicKey)
        throw new Error('Wallet not connected');

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: solanaWallet.publicKey,
          toPubkey: new PublicKey(toWallet),
          lamports: Number(lamports),
        })
      );

      tx.feePayer = solanaWallet.publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const signature = await solanaWallet.sendTransaction(
        tx,
        connection
      );

      await connection.confirmTransaction(signature, 'confirmed');

      await refreshBalance();

      return signature;
    },
    [connection, solanaWallet, refreshBalance]
  );

  const value = useMemo(
    () => ({
      ...solanaWallet,

      address,
      balanceLamports,

      wallets: solanaWallet.wallets,
      select: solanaWallet.select,
      connect: solanaWallet.connect,
      disconnect: solanaWallet.disconnect,

      connection,
      sendPayment,
      refreshBalance,

      openModal: () => setVisible(true),
      closeModal: () => setVisible(false),
    }),
    [
      solanaWallet,
      address,
      balanceLamports,
      connection,
      sendPayment,
      refreshBalance,
      setVisible,
    ]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletBridge>{children}</WalletBridge>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
