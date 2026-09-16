import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import {
  appendTxLog,
  clearContractAddress,
  DEFAULT_CONTRACT_ADDRESS,
  loadSavedContractAddress,
  loadTxLog,
  saveContractAddress,
  type TxLogEntry
} from "./midnight";
import {
  createVaultOnChain,
  initializeVaultContract,
  listOnChainVaults,
  withdrawOnChain
} from "./vaultContract";
import type { LockType, Vault } from "../types";

export interface AppNotice {
  tone: "success" | "error" | "info";
  title: string;
  body: string;
}

export function useVaultApp() {
  const { session, address, isConnected } = useWallet();
  const [contractAddress, setContractAddress] = useState<string | null>(
    () => loadSavedContractAddress() ?? DEFAULT_CONTRACT_ADDRESS
  );
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [treasury, setTreasury] = useState<{ address: string; balance: bigint }>({ address: "", balance: 0n });
  const [initialized, setInitialized] = useState(false);
  const [transactions, setTransactions] = useState<TxLogEntry[]>(() => loadTxLog());

  const reloadTxLog = useCallback(() => {
    setTransactions(loadTxLog());
  }, []);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const refresh = useCallback(async () => {
    if (!session || !contractAddress) {
      setVaults([]);
      setTreasury({ address: "", balance: 0n });
      setInitialized(false);
      return;
    }
    try {
      const snapshot = await listOnChainVaults(session, contractAddress);
      setVaults(snapshot.vaults);
      setTreasury(snapshot.treasury);
      setInitialized(snapshot.initialized);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Failed to load contract state.",
        body: error instanceof Error ? error.message : "Indexer query failed."
      });
    }
  }, [session, contractAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bindContractAddress = useCallback((addressValue: string) => {
    saveContractAddress(addressValue);
    setContractAddress(addressValue);
  }, []);

  const clearBoundContract = useCallback(() => {
    clearContractAddress();
    setContractAddress(null);
    setVaults([]);
    setInitialized(false);
    setTreasury({ address: "", balance: 0n });
  }, []);

  const createVault = useCallback(
    async (input: {
      asset: string;
      amount: bigint;
      unlockTime: number;
      lockType: LockType;
      penaltyBps: number;
    }) => {
      if (!session || !contractAddress) {
        setNotice({
          tone: "error",
          title: "Contract not ready.",
          body: "Connect a wallet and deploy/bind a contract first."
        });
        return null;
      }
      setBusy(true);
      setStatusMessage("Submitting createVault…");
      try {
        const result = await createVaultOnChain(session, contractAddress, input, setStatusMessage);
        setTransactions(
          appendTxLog({
            id: result.txId,
            kind: "CREATE",
            vaultId: result.vaultId,
            timestamp: Date.now(),
            status: "CONFIRMED",
            message: `Vault #${String(result.vaultId).padStart(3, "0")} created on-chain.`,
            txHash: result.txId
          })
        );
        await refresh();
        setNotice({
          tone: "success",
          title: "Vault created.",
          body: `Vault #${String(result.vaultId).padStart(3, "0")} locked. Tx ${result.txId.slice(0, 12)}…`
        });
        return { id: result.vaultId };
      } catch (error) {
        setNotice({
          tone: "error",
          title: "Create vault failed.",
          body: error instanceof Error ? error.message : "Transaction failed."
        });
        return null;
      } finally {
        setBusy(false);
        setStatusMessage(null);
      }
    },
    [session, contractAddress, refresh]
  );

  const withdrawVault = useCallback(
    async (vaultId: number) => {
      if (!session || !contractAddress) return null;
      setBusy(true);
      setStatusMessage("Submitting withdraw…");
      try {
        const result = await withdrawOnChain(session, contractAddress, vaultId, "withdraw", setStatusMessage);
        setTransactions(
          appendTxLog({
            id: result.txId,
            kind: "WITHDRAW",
            vaultId,
            timestamp: Date.now(),
            status: "CONFIRMED",
            message: `Vault #${vaultId} withdrawn.`,
            txHash: result.txId
          })
        );
        await refresh();
        setNotice({
          tone: "success",
          title: "Withdrawal submitted.",
          body: `Tx ${result.txId.slice(0, 12)}…`
        });
        return result;
      } catch (error) {
        setNotice({
          tone: "error",
          title: "Withdrawal failed.",
          body: error instanceof Error ? error.message : "Transaction failed."
        });
        return null;
      } finally {
        setBusy(false);
        setStatusMessage(null);
      }
    },
    [session, contractAddress, refresh]
  );

  const withdrawWithPenalty = useCallback(
    async (vaultId: number) => {
      if (!session || !contractAddress) return null;
      setBusy(true);
      setStatusMessage("Submitting early withdrawal…");
      try {
        const result = await withdrawOnChain(session, contractAddress, vaultId, "penalty", setStatusMessage);
        setTransactions(
          appendTxLog({
            id: result.txId,
            kind: "PENALTY_WITHDRAW",
            vaultId,
            timestamp: Date.now(),
            status: "CONFIRMED",
            message: `Vault #${vaultId} early withdrawal with penalty.`,
            txHash: result.txId
          })
        );
        await refresh();
        setNotice({
          tone: "success",
          title: "Early withdrawal submitted.",
          body: `Tx ${result.txId.slice(0, 12)}…`
        });
        return result;
      } catch (error) {
        setNotice({
          tone: "error",
          title: "Early withdrawal failed.",
          body: error instanceof Error ? error.message : "Transaction failed."
        });
        return null;
      } finally {
        setBusy(false);
        setStatusMessage(null);
      }
    },
    [session, contractAddress, refresh]
  );

  return {
    now,
    vaults,
    transactions,
    treasury,
    notice,
    busy,
    statusMessage,
    contractAddress,
    initialized,
    isConnected,
    address,
    dismissNotice: () => setNotice(null),
    refresh,
    reloadTxLog,
    bindContractAddress,
    clearBoundContract,
    createVault,
    withdrawVault,
    withdrawWithPenalty,
    initialize: async (treasuryHex: string) => {
      if (!session || !contractAddress) throw new Error("Connect wallet and bind a contract first.");
      setBusy(true);
      try {
        const txId = await initializeVaultContract(session, contractAddress, treasuryHex, setStatusMessage);
        setTransactions(
          appendTxLog({
            id: txId,
            kind: "INITIALIZE",
            timestamp: Date.now(),
            status: "CONFIRMED",
            message: "Contract initialized.",
            txHash: txId
          })
        );
        await refresh();
        return txId;
      } finally {
        setBusy(false);
        setStatusMessage(null);
      }
    }
  };
}
