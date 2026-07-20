import { useState, useEffect } from 'react'; // <- adiciona useEffect
import { useI18n } from '../i18n/I18nProvider';
import { useWallet } from './WalletProvider';
import {
  shortenAddress,
  formatSol,
  copyToClipboard,
  WALLET_READY_STATE,
} from './walletUtils';
import { audioManager } from '../audio/AudioManager';

export default function WalletButton() {
  const { t } = useI18n();

  const {
    address, // <- esse aqui já vem do provider depois do connect
    balanceLamports,
    status,
    walletName,
    walletIcon,
    wallets = [],
    connect,
    disconnect,
    openModal,
    networkMismatch,
  } = useWallet();

  const [copied, setCopied] = useState(false);

  // ADICIONA ISSO AQUI: conecta o WS quando a wallet conectar
  useEffect(() => {
    if (status === 'connected' && address) {
      console.log('[WS] Conectando com wallet:', address);
      // Troca pela sua função de connectWS
      window.connectWS?.(address);
    }
  }, [status, address]);

  const handleConnectClick = async () => {
    try {
      audioManager.play('click');
    } catch {}

    try {
      const installed = wallets.filter(
        (wallet) => wallet.readyState === WALLET_READY_STATE.INSTALLED
      );

      if (installed.length === 1) {
        await connect(installed[0].adapter.name);
        audioManager.play('walletConnect');
        return;
      }

      openModal();
    } catch (err) {
      console.error('Erro ao conectar carteira:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      audioManager.play('walletDisconnect');
      await disconnect();
      window.ws?.close(); // <- fecha o WS tbm
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = async () => {
    if (!address) return;

    if (await copyToClipboard(address)) {
      audioManager.play('click');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (status === 'connected' && address) {
    return (
      <div className="wallet-panel">
        {networkMismatch && (
          <span className="wallet-panel__warning" title={t('networkMismatch')}>
            ⚠️
          </span>
        )}

        {walletIcon && (
          <img src={walletIcon} alt={walletName} className="wallet-panel__icon" />
        )}

        <span className="wallet-panel__balance">
          {formatSol(balanceLamports)}
        </span>

        <button className="wallet-panel__address" onClick={handleCopy}>
          {copied? t('copied') : shortenAddress(address)}
        </button>

        <button
          className="wallet-panel__disconnect"
          onClick={handleDisconnect}
          aria-label={t('disconnect')}
        >
          ⏻
        </button>
      </div>
    );
  }

  return (
    <button className="wallet-pill" onClick={handleConnectClick}>
      {t('connectWallet')}
    </button>
  );
}
