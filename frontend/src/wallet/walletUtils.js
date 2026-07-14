export function shortenAddress(address, chars = 4) {
  if (!address) return '';
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function lamportsToSol(lamports) {
  if (lamports == null) return null;
  return lamports / 1e9;
}

export function formatSol(lamports, { decimals = 3 } = {}) {
  const sol = lamportsToSol(lamports);
  if (sol == null) return '—';
  return `${sol.toFixed(decimals)} SOL`;
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Wallet Adapter's `readyState` enum, restated here so components never need
// to import @solana/wallet-adapter-base directly.
export const WALLET_READY_STATE = {
  INSTALLED: 'Installed',
  LOADABLE: 'Loadable',
  NOT_DETECTED: 'NotDetected',
  UNSUPPORTED: 'Unsupported',
};
