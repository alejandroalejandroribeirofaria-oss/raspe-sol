import { createContext } from 'react';

// Shape kept intentionally flat so components can destructure exactly what
// they need without re-rendering on unrelated changes (see useWallet.js).
export const WalletContext = createContext(null);
