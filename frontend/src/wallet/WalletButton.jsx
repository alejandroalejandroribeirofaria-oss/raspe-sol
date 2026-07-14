import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useWallet } from './useWallet.js';
import { shortenAddress, formatSol, copyToClipboard, WALLET_READY_STATE } from './walletUtils.js';
import { audioManager } from '../audio/AudioManager.js';

export default function WalletButton() {
  const { t } = useI18n();
  const {
    address,
    balanceLamports,
    status,
    walletName,
    walletIcon,
    wallets,
    openModal,
    connect,
    disconnect,
    networkMismatch,
  } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleConnectClick = async () => {
    audioManager.play('click');
    const installed = wallets.filter((w) => w.readyState === WALLET_READY_STATE.INSTALLED);
    if (installed.length === 1) {
      try {
        await connect(installed[0].adapter.name);
        audioManager.play('walletConnect');
      } catch {
        // status already reflects the failure (locked / error)
      }
      return;
    }
    openModal();
  };

  const handleDisconnect = () => {
    audioManager.play('walletDisconnect');
    disconnect();
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(address);
    if (ok) {
      audioManager.play('click');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (status === 'connected' && address) {
    return (
      <div className="wallet-panel">
        {networkMismatch && <span className="wallet-panel__warning" title={t('networkMismatch')}>⚠️</span>}
        {walletIcon && <img src={walletIcon} alt={walletName} className="wallet-panel__icon" />}
        <span className="wallet-panel__balance">{formatSol(balanceLamports)}</span>
        <button className="wallet-panel__address" onClick={handleCopy}>
          {copied ? t('copied') : shortenAddress(address)}
        </button>
        <button className="wallet-panel__disconnect" onClick={handleDisconnect} aria-label={t('disconnect')}>
          ⏻
        </button>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="wallet-panel wallet-panel--warning">
        <span>{t('walletLocked')}</span>
      </div>
    );
  }

  return (
    <button className="wallet-pill" onClick={handleConnectClick}>
      {t('connectWallet')}
    </button>
  );
}
