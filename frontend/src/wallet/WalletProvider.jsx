import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Estilos do modal
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletCtx = createContext(null);

export function WalletProvider({ children }) {
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

  // SÓ Phantom + Solflare por enquanto. Sem Ledger/Coinbase/Trust
  // Eles puxam crypto/stream do Node e quebram o build do Vite
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const [address, setAddress] = useState(null);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextBridge setAddress={setAddress}>
            <WalletCtx.Provider value={{ address }}>
              {children}
            </WalletCtx.Provider>
          </WalletContextBridge>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

// Bridge pra pegar a address do hook e jogar no nosso context
function WalletContextBridge({ children, setAddress }) {
  const { publicKey } = useWallet();
  
  useEffect(() => {
    setAddress(publicKey?.toBase58() || null);
  }, [publicKey, setAddress]);

  return children;
}

export function useWalletContext() {
  return useContext(WalletCtx);
}
