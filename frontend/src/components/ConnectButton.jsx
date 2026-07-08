import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';

export default function ConnectButton() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tenta reconectar automaticamente se já conectou antes
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      const provider = window.solana;
      if (provider?.isPhantom) {
        try {
          const { publicKey } = await provider.connect({ onlyIfTrusted: true });
          if (publicKey) setWallet(publicKey.toString());
        } catch (err) {
          console.log("Nao conectado ainda");
        }
      }
    };
    checkIfWalletIsConnected();
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    try {
      const provider = window.solana;
      
      if (!provider || !provider.isPhantom) {
        alert("Instale a Phantom Wallet primeiro!");
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const resp = await provider.connect();
      setWallet(resp.publicKey.toString());
      console.log("Wallet conectada:", resp.publicKey.toString());

    } catch (err) {
      console.error("Erro ao conectar:", err);
    } finally {
      setLoading(false);
    }
  };

  const shortWallet = wallet ? `${wallet.slice(0,4)}...${wallet.slice(-4)}` : "";

  return (
    <button 
      onClick={connectWallet} 
      disabled={loading}
      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition"
    >
      <Wallet size={18} />
      {loading ? "Conectando..." : wallet ? shortWallet : "Conectar Phantom"}
    </button>
  );
}
