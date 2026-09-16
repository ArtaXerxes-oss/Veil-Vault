// =============================================================================
// VeilCommerce — Midnight Wallet Hook (Legacy Shim)
// -----------------------------------------------------------------------------
// Upgraded to support BOTH 1AM (dust-free) and Lace (DApp Connector) wallets.
// This file remains for backward compatibility — new code should import
// `useWallet` from '../contexts/WalletContext'.
// Delegates to WalletContext when available, falls back to standalone impl.
// =============================================================================

import { useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { listInjectedWallets } from '../lib/midnight';

// Keep DApp Connector types augmented
import '@midnight-ntwrk/dapp-connector-api';

export interface MidnightWalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  networkId: string | null;
  error: string | null;
  api: any | null;
  walletType?: '1am' | 'lace' | null;
  walletName?: string | null;
  walletStatus?: 'checking' | 'detected' | 'not-found';
}

/**
 * Legacy hook — now powered by WalletContext (supports 1AM + Lace).
 * Preserves old return shape so existing components don't break.
 */
export function useMidnightWallet(): MidnightWalletState & {
  connect: () => Promise<void>;
  disconnect: () => void;
  detectWallet: () => any | null;
  detectedWallets: any[];
  walletType: '1am' | 'lace' | null;
  walletStatus: 'checking' | 'detected' | 'not-found';
  session: any;
  config: any;
} {
  const ctx = useWallet();

  const connect = useCallback(async () => {
    await ctx.connect('preprod');
  }, [ctx]);

  const detectWallet = useCallback(() => {
    // Return raw InitialAPI for legacy callers
    const w = listInjectedWallets()[0];
    return w?.api ?? null;
  }, []);

  return {
    isConnected: ctx.isConnected,
    isConnecting: ctx.isConnecting,
    address: ctx.address,
    networkId: ctx.network,
    error: ctx.error,
    api: ctx.session?.api ?? null,
    walletType: ctx.walletType,
    walletName: ctx.walletType === '1am' ? '1AM' : ctx.walletType === 'lace' ? 'Lace' : null,
    walletStatus: ctx.walletStatus,
    detectedWallets: ctx.availableWallets,
    session: ctx.session,
    config: ctx.session?.config ?? null,
    connect,
    disconnect: ctx.disconnect,
    detectWallet,
  };
}

// Standalone detection helper (used without Provider)
export function detectWalletStandalone(): any | null {
  const w = listInjectedWallets()[0];
  return w?.api ?? null;
}

// Network configuration (kept for legacy imports)
export const MIDNIGHT_PREPROD_CONFIG = {
  networkId: 'preprod',
  indexerUri: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUri: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  nodeUri: 'https://rpc.preprod.midnight.network',
  proverServerUri: 'http://127.0.0.1:6300',
};