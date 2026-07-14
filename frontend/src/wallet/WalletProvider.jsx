import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useConnection,
  useWallet as useAdapterWallet,
  WalletReadyState,
} from '@solana/wallet-adapter-react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  CloverWalletAdapter,
  NightlyWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletContext } from './WalletContext.jsx';

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const buildAdapters = () => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new CoinbaseWalletAdapter(),
  new NightlyWalletAdapter(),
  new CloverWalletAdapter(),
  new TrustWalletAdapter(),
  new LedgerWalletAdapter(),
];

const BALANCE_POLL_MS = 30_000;
const NETWORK_POLL_MS = 20_000;

function WalletBridge({ children }) {
  const { connection } = useConnection();
  const { wallet, wallets, publicKey, connected, connecting, disconnecting, select, connect, disconnect, sendTransaction } = useAdapterWallet();

  const [balanceLamports, setBalanceLamports] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const initialGenesisHash = useRef(null);
  const pendingConnectRef = useRef(null);

  const address = publicKey?.toBase58()?? null;

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return setBalanceLamports(null);
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      setBalanceLamports(lamports);
    } catch (e) {
      console.error('refreshBalance error', e);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    refreshBalance();
    const subId = connection.onAccountChange(publicKey, (info) => setBalanceLamports(info.lamports), 'confirmed');
    const interval = setInterval(refreshBalance, BALANCE_POLL_MS);
    return () => {
      connection.removeAccountChangeListener(subId).catch(() => {});
      clearInterval(interval);
    };
  }, [connection, publicKey, refreshBalance]);

  useEffect(() => {
    let cancelled = false;
    connection.getGenesisHash().then((hash) => {
      if (!cancelled) initialGenesisHash.current = hash;
    }).catch(() => {});

    const interval = setInterval(async () => {
      try {
        const hash = await connection.getGenesisHash();
        if (initialGenesisHash.current && hash!== initialGenesisHash.current) {
          setNetworkMismatch(true);
        }
      } catch {}
    }, NETWORK_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connection]);

  useEffect(() => {
    if (connecting) return setStatus('connecting');
    if (connected && publicKey) return setStatus('connected');
    if (wallet?.adapter?.readyState === WalletReadyState.NotDetected) return setStatus('not_installed');
    setStatus('idle');
  }, [connecting, connected, publicKey, wallet]);

  useEffect(() => {
    const pending = pendingConnectRef.current;
    if (!pending || wallet?.adapter?.name!== pending.name) return;

    pendingConnectRef.current = null;
    connect()
     .then(() => {
        setModalOpen(false);
        pending.resolve();
      })
     .catch((err) => {
        const name = err?.name || '';
        if (name === 'WalletNotReadyError') {
          setStatus('not_installed');
        } else if (name === 'WalletConnectionError' || /locked/i.test(err?.message || '')) {
          setStatus('locked');
          setErrorMessage('walletLocked');
        } else {
          setStatus('error');
          setErrorMessage(err?.message || 'CONNECT_FAILED');
        }
        pending.reject(err);
      });
  }, [wallet, connect]);

  const connectWallet = useCallback(
    (walletName) => {
      setErrorMessage(null);
      if (wallet?.adapter?.name === walletName) {
        return connect()
         .then(() => setModalOpen(false))
         .catch((err) => {
            const name = err?.name || '';
            if (name === 'WalletNotReadyError') setStatus('not_installed');
            else if (name === 'WalletConnectionError' || /locked/i.test(err?.message || '')) {
              setStatus('locked');
              setErrorMessage('walletLocked');
            } else {
              setStatus('error');
              setErrorMessage(err?.message || 'CONNECT_FAILED');
            }
            throw err;
          });
      }
      return new Promise((resolve, reject) => {
        pendingConnectRef.current = { name: walletName, resolve, reject };
        select(walletName);
      });
    },
    [select, connect, wallet]
  );

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
    } finally {
      setBalanceLamports(null);
      setStatus('idle');
      setNetworkMismatch(false);
    }
  }, [disconnect]);

  const sendPayment = useCallback(
    async ({ toWallet, lamports }) => {
      if (!publicKey) throw new Error('WALLET_NOT_CONNECTED');
      const toPubkey = new PublicKey(toWallet);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey, lamports })
      );
      const signature = await sendTransaction(tx, connection);
      return signature;
    },
    [publicKey, connection, sendTransaction]
  );

  const value = useMemo(
    () => ({
      address,
      publicKey,
      balanceLamports,
      status,
      errorMessage,
      connecting,
      disconnecting,
      networkMismatch,
      walletName: wallet?.adapter?.name?? null,
      walletIcon: wallet?.adapter?.icon?? null,
      wallets,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      connect: connectWallet,
      disconnect: disconnectWallet,
      refreshBalance,
      sendPayment,
      connection,
    }),
    [
      address,
      publicKey,
      balanceLamports,
      status,
      errorMessage,
      connecting,
      disconnecting,
      networkMismatch,
      wallet,
      wallets,
      modalOpen,
      connectWallet,
      disconnectWallet,
      refreshBalance,
      sendPayment,
      connection,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }) {
  const adapters = useMemo(buildAdapters, []);
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <SolanaWalletProvider wallets={adapters} autoConnect onError={() => {}}>
        <WalletBridge>{children}</WalletBridge>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
    }
