import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { LedgerParameters, ZswapChainState } from "@midnight-ntwrk/ledger-v8";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import type { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import "@midnight-ntwrk/dapp-connector-api";

export const ZK_ASSET_PATH = "/contract/time-locked-vault";
export const PRIVATE_STATE_ID = "veilVaultPrivateState" as const;
export const CONTRACT_ADDRESS_KEY = "veil-vault-contract-address";
export const DEFAULT_CONTRACT_ADDRESS: string =
  ((import.meta as { env?: { VITE_CONTRACT_ADDRESS?: string } }).env?.VITE_CONTRACT_ADDRESS as string | undefined) ??
  "ca572dfc83d9eef244fdecc3becb0cc03ed56f6590f28cceaabee5c9688ba3ed";
export const TX_LOG_KEY = "veil-vault-tx-log-v1";

export type MidnightNetwork = "preview" | "preprod" | "mainnet" | "undeployed";

export type DetectedWallet = {
  api: InitialAPI;
  name: string;
  type: "1am" | "lace" | "other";
  key: string;
};

export type ConnectedSession = {
  api: any;
  config: any;
  providers: {
    privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
    publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
    zkConfigProvider: FetchZkConfigProvider<any>;
    proofProvider: { proveTx: (unprovenTx: any, _config: any) => Promise<any> };
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
  };
  unshieldedAddress: string;
  networkId: string;
};

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) throw new Error("Invalid hex string from wallet.");
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

export function randomBytes32(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return toHex(bytes);
}

export function hexToBytes32(hex: string): Uint8Array {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleaned.length !== 64) {
    throw new Error("Expected a 32-byte hex string (64 characters).");
  }
  return fromHex(cleaned);
}

export function classifyWalletType(key: string, name?: string): DetectedWallet["type"] {
  const normalizedName = name ?? "";
  if (key === "1am" || /1am/i.test(normalizedName)) return "1am";
  if (key === "mnLace" || /lace/i.test(normalizedName)) return "lace";
  return "other";
}

export function listWallets(): DetectedWallet[] {
  const injected = window.midnight;
  if (!injected) return [];
  return Object.entries(injected).map(([key, api]) => ({
    api,
    key,
    name: api.name ?? key,
    type: classifyWalletType(key, api.name),
  }));
}

export function listInjectedWallets(): Array<{ id: string; api: InitialAPI }> {
  const injected = window.midnight;
  if (!injected) return [];
  return Object.entries(injected).map(([id, api]) => ({ id, api }));
}

export function pickWallet(preferred?: "1am" | "lace"): { id: string; api: InitialAPI } | null {
  const wallets = listInjectedWallets();
  if (wallets.length === 0) return null;

  if (preferred === "1am") {
    const hit = wallets.find((w) => w.id === "1am" || /1am/i.test(w.api.name ?? ""));
    if (hit) return hit;
  }
  if (preferred === "lace") {
    const hit = wallets.find((w) => w.id === "mnLace" || /lace/i.test(w.api.name ?? ""));
    if (hit) return hit;
  }

  const oneAm = wallets.find((w) => w.id === "1am" || /1am/i.test(w.api.name ?? ""));
  if (oneAm) return oneAm;
  const lace = wallets.find((w) => w.id === "mnLace" || /lace/i.test(w.api.name ?? ""));
  if (lace) return lace;
  return wallets[0];
}

export function createPrivateStateProvider() {
  let scope = "";
  const stateStore = new Map<string, unknown>();
  const signingKeyStore = new Map<string, unknown>();
  const key = (id: string) => `${scope}:${id}`;

  return {
    setContractAddress(address: string) {
      scope = address;
    },
    async set(id: string, state: unknown) {
      stateStore.set(key(id), state);
    },
    async get(id: string) {
      return stateStore.get(key(id)) ?? null;
    },
    async remove(id: string) {
      stateStore.delete(key(id));
    },
    async clear() {
      stateStore.clear();
    },
    async setSigningKey(addr: string, k: unknown) {
      signingKeyStore.set(addr, k);
    },
    async getSigningKey(addr: string) {
      return signingKeyStore.get(addr) ?? null;
    },
    async removeSigningKey(addr: string) {
      signingKeyStore.delete(addr);
    },
    async clearSigningKeys() {
      signingKeyStore.clear();
    },
    async exportPrivateStates(): Promise<never> {
      throw new Error("Not implemented.");
    },
    async importPrivateStates(): Promise<never> {
      throw new Error("Not implemented.");
    },
    async exportSigningKeys(): Promise<never> {
      throw new Error("Not implemented.");
    },
    async importSigningKeys(): Promise<never> {
      throw new Error("Not implemented.");
    }
  };
}

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl);

  async function queryLatest(query: string, address: string) {
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { address } })
    });
    if (!res.ok) throw new Error(`Indexer HTTP error: ${res.status}`);
    const payload = await res.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((e: { message: string }) => e.message).join("; "));
    }
    return payload.data?.contractAction ?? null;
  }

  return {
    ...base,
    async queryContractState(contractAddress: string, config?: unknown) {
      if (config) return base.queryContractState(contractAddress, config as never);

      const action = await queryLatest(
        `
        query LATEST_CONTRACT_STATE($address: HexEncoded!) {
          contractAction(address: $address) { state }
        }`,
        contractAddress
      );
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress: string, config?: unknown) {
      if (config) return base.queryZSwapAndContractState(contractAddress, config as never);

      const action = await queryLatest(
        `
        query LATEST_BOTH_STATE($address: HexEncoded!) {
          contractAction(address: $address) {
            state
            zswapState
            transaction { block { ledgerParameters } }
          }
        }`,
        contractAddress
      );

      if (!action?.zswapState) return null;
      return [
        ZswapChainState.deserialize(fromHex(action.zswapState)),
        ContractState.deserialize(fromHex(action.state)),
        action.transaction?.block?.ledgerParameters
          ? LedgerParameters.deserialize(fromHex(action.transaction.block.ledgerParameters))
          : LedgerParameters.initialParameters()
      ];
    }
  };
}

export async function createConnectedSession(api: any, zkBase: string = ZK_ASSET_PATH): Promise<ConnectedSession> {
  const [config, unshieldedAddress, shieldedAddress] = await Promise.all([
    api.getConfiguration(),
    api.getUnshieldedAddress(),
    api.getShieldedAddresses()
  ]);

  setNetworkId(config.networkId);

  const zkConfigProvider = new FetchZkConfigProvider(
    new URL(zkBase, window.location.origin).toString(),
    window.fetch.bind(window)
  );

  const provingProvider = await api.getProvingProvider(zkConfigProvider);

  const proofProvider = {
    async proveTx(unprovenTx: any, _config: any) {
      const { CostModel } = await import("@midnight-ntwrk/ledger-v8");
      return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
    }
  };

  const walletProvider = {
    getCoinPublicKey: () => shieldedAddress.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedAddress.shieldedEncryptionPublicKey,
    balanceTx: async (tx: any) => {
      const txHex = toHex(tx.serialize());
      const balanced = await api.balanceUnsealedTransaction(txHex);
      if (!balanced?.tx) throw new Error("balanceUnsealedTransaction returned invalid result");
      const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
      return Transaction.deserialize("signature", "proof", "binding", fromHex(balanced.tx));
    }
  } as WalletProvider;

  const midnightProvider = {
    submitTx: async (tx: any) => {
      const txHex = toHex(tx.serialize());
      const result = await api.submitTransaction(txHex);
      if (typeof result === "string" && result) return result;
      if (result?.transactionId) return result.transactionId;
      if (result?.id) return result.id;
      return txHex.slice(0, 64);
    }
  } as MidnightProvider;

  const publicDataProvider = createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);

  return {
    api,
    config,
    providers: {
      privateStateProvider: createPrivateStateProvider(),
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider
    },
    unshieldedAddress: unshieldedAddress.unshieldedAddress,
    networkId: config.networkId
  };
}

export async function waitForContractDeployment(
  publicDataProvider: ConnectedSession["providers"]["publicDataProvider"],
  contractAddress: string,
  pollIntervalMs = 2000,
  maxAttempts = 45
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const state = await publicDataProvider.queryContractState(contractAddress);
    if (state?.data) return;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`Contract not indexed after ${maxAttempts * pollIntervalMs}ms`);
}

export async function waitForStateAdvance(
  publicDataProvider: ConnectedSession["providers"]["publicDataProvider"],
  hasAdvanced: (provider: ConnectedSession["providers"]["publicDataProvider"]) => Promise<boolean>,
  pollIntervalMs = 2000,
  maxAttempts = 45
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await hasAdvanced(publicDataProvider)) return;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`State did not advance after ${maxAttempts * pollIntervalMs}ms`);
}

export function loadSavedContractAddress(): string | null {
  try {
    return localStorage.getItem(CONTRACT_ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function saveContractAddress(address: string): void {
  localStorage.setItem(CONTRACT_ADDRESS_KEY, address);
}

export function clearContractAddress(): void {
  localStorage.removeItem(CONTRACT_ADDRESS_KEY);
}

export type TxLogEntry = {
  id: string;
  kind: "DEPLOY" | "INITIALIZE" | "CREATE" | "WITHDRAW" | "PENALTY_WITHDRAW";
  vaultId?: number;
  timestamp: number;
  status: "SUBMITTED" | "CONFIRMED" | "FAILED";
  message: string;
  txHash?: string;
};

export function loadTxLog(): TxLogEntry[] {
  try {
    const raw = localStorage.getItem(TX_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TxLogEntry[];
  } catch {
    return [];
  }
}

export function appendTxLog(entry: TxLogEntry): TxLogEntry[] {
  const next = [entry, ...loadTxLog()].slice(0, 100);
  localStorage.setItem(TX_LOG_KEY, JSON.stringify(next));
  return next;
}
