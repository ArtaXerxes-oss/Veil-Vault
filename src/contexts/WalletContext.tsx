// =============================================================================
// VeilCommerce — Wallet Context (1AM + Lace) — Reference Accurate
// -----------------------------------------------------------------------------
// Strictly follows reference implementations from the 11 repos:
//  - Midnight-Skills templates/locker-dapp/lib/midnight.ts (canonical session)
//  - dmarket-main/gui/src/contexts/BrowserDeployedDMarketManager.ts (robust
//    polling, semver check, Object.values(window.midnight) UUID enumeration)
//  - kredz-main/kredz-frontend/src/hooks/useMidnightWallet.ts (1AM polling)
//  - Midnight-ZK-Judge/frontend/src/contexts/MidnightContext.tsx (midnight + lace)
//  - Midnight-Skills 1am-wallet + react-wallet-connector skills
// No mocks, no simulations — real wallet only.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createConnectedSession,
  listWallets,
  type ConnectedSession,
  type DetectedWallet,
  type MidnightNetwork,
} from '../lib/midnight';

// Augment window.midnight types (DApp Connector API)
import '@midnight-ntwrk/dapp-connector-api';

export type { ConnectedSession, DetectedWallet };

export type WalletType = '1am' | 'lace' | null;
export type WalletStatus = 'checking' | 'detected' | 'not-found';

export type WalletContextType = {
  address: string | null;
  unshieldedAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletType: WalletType;
  walletName: string | null;
  walletStatus: WalletStatus;
  detectedWallets: DetectedWallet[];
  session: ConnectedSession | null;
  config: any | null;
  error: string | null;
  connect: (network?: string) => Promise<ConnectedSession | undefined>;
  connectWallet: (wallet: DetectedWallet, network?: string) => Promise<ConnectedSession | undefined>;
  disconnect: () => void;
  refreshWallets: () => DetectedWallet[];
  selectedWallet: DetectedWallet | null;
  // Backward-compat derived fields (existing UI consumers)
  network: MidnightNetwork;
  availableWallets: string[];
};

const WalletContext = createContext<WalletContextType | null>(null);

function inferWalletType(w: DetectedWallet | null): WalletType {
  if (!w) return null;
  if (w.type === '1am') return '1am';
  if (w.type === 'lace') return 'lace';
  return null;
}

function inferWalletTypeFromWallets(wallets: DetectedWallet[]): WalletType {
  if (wallets.find((w) => w.type === '1am')) return '1am';
  if (wallets.find((w) => w.type === 'lace')) return 'lace';
  return wallets.length > 0 ? null : null;
}

// Poll for wallet with interval, like kredz 50*100ms and dmarket interval(100)
function waitForWallet(timeoutMs = 2000, intervalMs = 100): Promise<DetectedWallet | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const w = listWallets();
      const preferred = w.find((x) => x.type === '1am') ?? w.find((x) => x.type === 'lace') ?? w[0] ?? null;
      if (preferred) {
        resolve(preferred);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        // Also check raw fallback like kredz does: window.midnight['1am']
        const raw = (window as any).midnight?.['1am'] ?? (window as any).midnight?.mnLace ?? (window as any).lace?.midnight;
        if (raw) {
          const name = raw.name ?? (raw === (window as any).midnight?.['1am'] ? '1AM' : 'Lace');
          const key = raw === (window as any).midnight?.['1am'] ? '1am' : 'mnLace';
          const type: DetectedWallet['type'] = name.toLowerCase().includes('1am') || key === '1am' ? '1am' : 'lace';
          resolve({ api: raw, name, type, key });
          return;
        }
        resolve(null);
        return;
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [unshieldedAddress, setUnshieldedAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('checking');
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<DetectedWallet | null>(null);
  const connectingRef = useRef(false);

  const refreshWallets = useCallback(() => {
    const wallets = listWallets();
    setDetectedWallets(wallets);
    if (wallets.length > 0) {
      setWalletStatus('detected');
      if (!isConnected) {
        const inferred = inferWalletTypeFromWallets(wallets);
        if (inferred) setWalletType(inferred);
      }
    }
    return wallets;
  }, [isConnected]);

  // Initial detection — mirrors Midnight-ZK-Judge 1500ms interval and dmarket 100ms polling
  useEffect(() => {
    refreshWallets();
    const startedAt = Date.now();
    const id = setInterval(() => {
      const wallets = listWallets();
      setDetectedWallets(wallets);
      if (wallets.length > 0) {
        setWalletStatus('detected');
        const t = inferWalletTypeFromWallets(wallets);
        if (t) setWalletType(t);
        // Keep polling occasionally like ZK-Judge (1500ms) to handle late injection, but stop after 6s if not found
        if (Date.now() - startedAt >= 6000) clearInterval(id);
        return;
      }
      if (Date.now() - startedAt >= 6000) {
        setWalletStatus('not-found');
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, [refreshWallets]);

  const connectWallet = useCallback(async (wallet: DetectedWallet, network = 'preprod') => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    // Version check — like dmarket semver 4.x check (without semver dep, use prefix)
    if (wallet.api?.apiVersion) {
      const v = String(wallet.api.apiVersion);
      if (!v.startsWith('4.')) {
        const msg = `Incompatible wallet version ${v}, expected 4.x. Please update 1AM or Lace.`;
        setError(msg);
        setIsConnecting(false);
        connectingRef.current = false;
        throw new Error(msg);
      }
    }

    try {
      console.log(`[VeilCommerce] Connecting to ${wallet.name} (${wallet.type}) on ${network}...`);
      let api: any;
      // DApp Connector API: connect(networkId) — dmarket/kredz style
      // 1AM supports string, Lace supports string, legacy may support {networkId}
      try {
        api = await wallet.api.connect(network);
        console.log('[VeilCommerce] connect(string) succeeded');
      } catch (e: any) {
        console.warn('[VeilCommerce] connect(string) failed, trying object form:', e?.message);
        // Fallback to object form (legacy wallet-sdk) like old useMidnightWallet did: connect({networkId})
        if (String(e?.message ?? '').toLowerCase().includes('network') || String(e).includes('networkId')) {
          api = await (wallet.api as any).connect({ networkId: network });
          console.log('[VeilCommerce] connect({networkId}) succeeded');
        } else {
          throw e;
        }
      }

      // Some wallets return void/undefined but expose ConnectedAPI on same object
      if (!api || typeof api.getConfiguration !== 'function') {
        console.warn('[VeilCommerce] connect returned no API, using InitialAPI as fallback');
        api = wallet.api;
        // Try enable() as fallback (ZK-Judge style: enable() vs connect())
        if (typeof (wallet.api as any).enable === 'function' && typeof api.getConfiguration !== 'function') {
          try {
            api = await (wallet.api as any).enable();
            console.log('[VeilCommerce] enable() succeeded');
          } catch {}
        }
      }

      if (!api || typeof api.getConfiguration !== 'function' || typeof api.getShieldedAddresses !== 'function') {
        throw new Error('Wallet did not return a valid ConnectedAPI. Is wallet unlocked and on correct network?');
      }

      // Verify connection status if available (dmarket does getConnectionStatus)
      try {
        if (typeof api.getConnectionStatus === 'function') {
          const status = await api.getConnectionStatus();
          console.log('[VeilCommerce] connectionStatus:', status);
        }
      } catch {}

      // Create Midnight session — exactly like locker-dapp template
      // ZK assets are hosted at the compiled contract path (see sync:zk)
      const sess = await createConnectedSession(api, '/contract/time-locked-vault');

      setSession(sess);
      setConfig(sess.config);
      const addr = sess.unshieldedAddress;
      setAddress(addr);
      setUnshieldedAddress(addr);
      setIsConnected(true);
      setWalletType(inferWalletType(wallet));
      setWalletName(wallet.name);
      setSelectedWallet(wallet);
      setError(null);
      console.log('[VeilCommerce] Connected:', wallet.name, addr, sess.config.networkId);
      return sess;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      // Map common errors to user-friendly messages like kredz does: ONEM_NOT_FOUND etc
      let friendly = msg;
      if (msg.includes('ONEM_NOT_FOUND') || msg.includes('No Midnight wallet')) {
        friendly = '1AM wallet not found. Please install the 1AM extension and refresh.';
      } else if (msg.includes('not authorized') || msg.includes('rejected') || msg.includes('denied')) {
        friendly = 'Connection rejected — please approve in wallet.';
      } else if (msg.includes('Extension installed') || msg.includes('not-found')) {
        friendly = 'No Midnight wallet detected. Install 1AM (dust-free) or Lace and refresh.';
      }
      setError(friendly);
      console.error('[WalletContext] connectWallet failed:', err);
      throw new Error(friendly);
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, []);

  const connect = useCallback(async (network = 'preprod') => {
    if (connectingRef.current) return;
    console.log('[VeilCommerce] connect() triggered, network:', network);
    const wallets = listWallets();
    setDetectedWallets(wallets);

    // If wallets already detected, prefer 1AM -> Lace -> first
    if (wallets.length > 0) {
      const preferred = wallets.find((w) => w.type === '1am') ?? wallets.find((w) => w.type === 'lace') ?? wallets[0];
      console.log('[VeilCommerce] auto-selecting wallet:', preferred.name);
      return connectWallet(preferred, network);
    }

    // No wallets yet — wait for injection like kredz 5s polling (50*100ms)
    console.log('[VeilCommerce] no wallets immediately, polling for injection...');
    const polled = await waitForWallet(3000, 100);
    if (polled) {
      console.log('[VeilCommerce] wallet appeared after polling:', polled.name);
      setDetectedWallets([polled]);
      setWalletStatus('detected');
      return connectWallet(polled, network);
    }

    const msg = 'No Midnight wallet found. Please install 1AM or Lace extension, make sure it is enabled and unlocked, then refresh.';
    setError(msg);
    setWalletStatus('not-found');
    console.error('[VeilCommerce] ' + msg);
    throw new Error(msg);
  }, [connectWallet]);

  const disconnect = useCallback(() => {
    console.log('[VeilCommerce] disconnecting');
    try {
      // Best-effort disconnect — not all wallets expose disconnect
      (session?.api as any)?.disconnect?.()?.catch(() => {});
      (selectedWallet?.api as any)?.disconnect?.()?.catch(() => {});
    } catch {}
    setAddress(null);
    setUnshieldedAddress(null);
    setIsConnected(false);
    setSession(null);
    setConfig(null);
    setSelectedWallet(null);
    setError(null);
    const wallets = listWallets();
    if (wallets.length === 0) {
      setWalletStatus('not-found');
      setWalletType(null);
      setWalletName(null);
    } else {
      setWalletStatus('detected');
    }
  }, [session, selectedWallet]);

  const network: MidnightNetwork =
    (config?.networkId as MidnightNetwork | undefined) ?? 'preprod';
  const availableWallets: string[] = detectedWallets.map((w) => w.name);

  return (
    <WalletContext.Provider
      value={{
        address,
        unshieldedAddress,
        isConnected,
        isConnecting,
        walletType,
        walletName,
        walletStatus,
        detectedWallets,
        session,
        config,
        error,
        connect,
        connectWallet,
        disconnect,
        refreshWallets,
        selectedWallet,
        network,
        availableWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}

export const useWalletContext = useWallet;