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
import type { LockType, TxPhase, Vault } from "../types";

export interface AppNotice {
  tone: "success" | "error" | "info";
  title: string;
  body: string;
}

function parseTxPhase(message: string): TxPhase {
  const lower = message.toLowerCase();
  if (lower.includes("proving")) return "proving";
  if (lower.includes("balanc")) return "balancing";
  if (lower.includes("submitting")) return "submitting";
  if (lower.includes("confirming") || lower.includes("waiting") || lower.includes("indexer")) return "confirming";
  return "submitting";
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
  const [txPhase, setTxPhase] = useState<TxPhase>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Wrap onProgress to also update txPhase
  const handleProgress = useCallback((message: string) => {
    setStatusMessage(message);
    setTxPhase(parseTxPhase(message));
  }, []);

  const resetTxState = useCallback(() => {
    setBusy(false);
    setStatusMessage(null);
    setTxPhase(null);
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
      releaseSecret?: string;
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
      setTxPhase("proving");
      setStatusMessage("Proving createVault circuit…");
      try {
        const result = await createVaultOnChain(session, contractAddress, input, handleProgress);
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
        resetTxState();
      }
    },
    [session, contractAddress, refresh, handleProgress, resetTxState]
  );

  const withdrawVault = useCallback(
    async (vaultId: number) => {
      if (!session || !contractAddress) return null;
      setBusy(true);
      setTxPhase("proving");
      setStatusMessage("Proving withdraw circuit…");
      try {
        const result = await withdrawOnChain(session, contractAddress, vaultId, "withdraw", handleProgress);
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
        resetTxState();
      }
    },
    [session, contractAddress, refresh, handleProgress, resetTxState]
  );

  const withdrawWithPenalty = useCallback(
    async (vaultId: number) => {
      if (!session || !contractAddress) return null;
      setBusy(true);
      setTxPhase("proving");
      setStatusMessage("Proving early withdrawal circuit…");
      try {
        const result = await withdrawOnChain(session, contractAddress, vaultId, "penalty", handleProgress);
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
        resetTxState();
      }
    },
    [session, contractAddress, refresh, handleProgress, resetTxState]
  );

  return {
    now,
    vaults,
    transactions,
    treasury,
    notice,
    busy,
    statusMessage,
    txPhase,
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
      setTxPhase("proving");
      try {
        const txId = await initializeVaultContract(session, contractAddress, treasuryHex, handleProgress);
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
        resetTxState();
      }
    }
  };
}
