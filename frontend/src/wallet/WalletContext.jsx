import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from '@solana/web3.js';

const WalletContext = createContext(null);

function getProvider() {
  if ('solana' in window && window.solana?.isPhantom) return window.solana;
  return null;
}

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null); // vamos salvar PublicKey object
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');

  const refreshBalance = useCallback(async (wallet, cluster = 'devnet') => {
    if (!wallet) return null;
    try {
      const connection = new Connection(clusterApiUrl(cluster), 'confirmed');
      const lamports = await connection.getBalance(wallet);
      const sol = lamports / LAMPORTS_PER_SOL;
      setBalance(sol);
      return sol;
    } catch {
      setBalance(0);
      return 0;
    }
  }, []);

  const connect = async (cluster = import.meta.env.VITE_DEFAULT_CLUSTER || 'devnet') => {
    const provider = getProvider();
    if (!provider) {
      window.open('https://phantom.app/', '_blank', 'noopener,noreferrer');
      setError('Instala a Phantom Wallet');
      return null; // <- NÃO JOGA ERRO PRA NÃO QUEBRAR O APP
    }

    try {
      const response = await provider.connect();
      const wallet = response.publicKey; // <- SALVA O OBJETO PublicKey
      setPublicKey(wallet);
      setError('');
      await refreshBalance(wallet, cluster);
      return wallet.toBase58();
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  const disconnect = async () => {
    await getProvider()?.disconnect?.();
    setPublicKey(null);
    setBalance(null);
  };

  const payForTicket = async ({ treasuryWallet, ticketPriceLamports, cluster }) => {
    const provider = getProvider();
    if (!provider || !publicKey) throw new Error('Wallet not connected');

    const connection = new Connection(clusterApiUrl(cluster), 'confirmed');
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey, // <- já é PublicKey
        toPubkey: new PublicKey(treasuryWallet),
        lamports: Number(ticketPriceLamports)
      })
    );

    transaction.feePayer = publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const signed = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    await refreshBalance(publicKey, cluster);
    return signature;
  };

  const value = useMemo(() => ({
    publicKey: publicKey?.toBase58() || null, // <- expõe como string pro App
    publicKeyObject: publicKey, // <- expõe o objeto pra uso interno
    balance,
    error,
    setError,
    connect,
    disconnect,
    refreshBalance,
    payForTicket,
    hasPhantom: Boolean(getProvider())
  }), [publicKey, balance, error, refreshBalance]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
