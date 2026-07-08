import { useState } from 'react';
import { Wallet } from 'lucide-react';

export default function ConnectButton() {
  const [wallet, setWallet] = useState(null);

  const connectWallet = async () => {
    try {
      const provider = window.solana;
      
      if (!provider || !provider.isPhantom) {
        // Se não tiver Phantom, abre a loja
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const resp = await provider.connect();
      setWallet(resp.publicKey.toString());
      console.log("Wallet conectada:", resp.publicKey.toString());

    } catch (err) {
      console.error("Erro ao conectar:", err);
    }
  };

  return (
    <button onClick={connectWallet} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
      <Wallet size={18} />
      {wallet ? `${wallet.slice(0,4)}...${wallet.slice(-4)}` : "Conectar Phantom"}
    </button>
  );
}
