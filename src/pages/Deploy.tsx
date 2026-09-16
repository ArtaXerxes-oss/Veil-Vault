import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import {
  appendTxLog,
  saveContractAddress,
  type MidnightNetwork
} from "../lib/midnight";
import { deployVaultContract, initializeVaultContract, readLedger } from "../lib/vaultContract";
import { randomBytes32, toHex } from "../lib/midnight";

interface DeployPageProps {
  contractAddress: string | null;
  initialized: boolean;
  busy: boolean;
  onBound: (address: string) => void;
  onCleared: () => void;
  onInitialized: () => Promise<void>;
  onTxLogged: () => void;
}

export function DeployPage({
  contractAddress,
  initialized,
  busy,
  onBound,
  onCleared,
  onInitialized,
  onTxLogged
}: DeployPageProps) {
  const { session, isConnected, connect, network, isConnecting } = useWallet();
  const [existingAddress, setExistingAddress] = useState(contractAddress ?? "");
  const [treasuryHex, setTreasuryHex] = useState(() => toHex(randomBytes32()));
  const [selectedNetwork, setSelectedNetwork] = useState<MidnightNetwork>(network);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function ensureSession() {
    if (session) return session;
    return connect(selectedNetwork);
  }

  async function handleDeploy() {
    setError(null);
    setWorking(true);
    try {
      const sess = await ensureSession();
      if (!sess) throw new Error("Wallet connection required.");
      const result = await deployVaultContract(sess, setStatus);
      saveContractAddress(result.contractAddress);
      onBound(result.contractAddress);
      appendTxLog({
        id: result.txId,
        kind: "DEPLOY",
        timestamp: Date.now(),
        status: "CONFIRMED",
        message: `Deployed contract ${result.contractAddress}`,
        txHash: result.txId
      });
      onTxLogged();
      setExistingAddress(result.contractAddress);
      setStatus(`Deployed at ${result.contractAddress}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed.");
    } finally {
      setWorking(false);
    }
  }

  async function handleBind() {
    setError(null);
    const trimmed = existingAddress.trim();
    if (!trimmed) {
      setError("Paste a contract address.");
      return;
    }
    setWorking(true);
    try {
      const sess = await ensureSession();
      if (!sess) throw new Error("Wallet connection required.");
      const ledgerState = await readLedger(sess, trimmed);
      if (!ledgerState) {
        setStatus("Address saved. Indexer has not returned state yet — it may still be confirming.");
      } else {
        setStatus(ledgerState.initialized ? "Bound to initialized contract." : "Bound. Contract needs initialize.");
      }
      saveContractAddress(trimmed);
      onBound(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not bind contract.");
    } finally {
      setWorking(false);
    }
  }

  async function handleInitialize() {
    setError(null);
    if (!contractAddress) {
      setError("Deploy or bind a contract first.");
      return;
    }
    setWorking(true);
    try {
      const sess = await ensureSession();
      if (!sess) throw new Error("Wallet connection required.");
      const txId = await initializeVaultContract(sess, contractAddress, treasuryHex, setStatus);
      appendTxLog({
        id: txId,
        kind: "INITIALIZE",
        timestamp: Date.now(),
        status: "CONFIRMED",
        message: "Contract initialized with treasury.",
        txHash: txId
      });
      onTxLogged();
      await onInitialized();
      setStatus(`Initialized. Tx ${txId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Initialize failed.");
    } finally {
      setWorking(false);
    }
  }

  const disabled = working || busy || isConnecting;

  return (
    <section className="narrow-page">
      <div className="page-intro compact-intro">
        <p className="section-kicker">CONTRACT</p>
        <h1>Deploy Compact vault</h1>
        <p className="intro-copy">
          Connect 1AM or Lace, deploy the compiled time-locked vault to Midnight, then initialize the treasury.
          No simulation — these are real wallet transactions.
        </p>
      </div>

      {!isConnected && (
        <div className="connect-banner" style={{ marginBottom: 28 }}>
          <div>
            <strong>Wallet required</strong>
            <p>Install and unlock 1AM or Lace Midnight wallet, then connect.</p>
          </div>
          <button className="secondary-button" disabled={disabled} onClick={() => void connect(selectedNetwork)}>
            Connect wallet <span>↗</span>
          </button>
        </div>
      )}

      <div className="form-section">
        <label className="field-label" htmlFor="network">Network</label>
        <select
          id="network"
          value={selectedNetwork}
          disabled={disabled || isConnected}
          onChange={(e) => setSelectedNetwork(e.target.value as MidnightNetwork)}
        >
          <option value="preprod">preprod</option>
          <option value="preview">preview</option>
          <option value="undeployed">undeployed (local)</option>
          <option value="mainnet">mainnet</option>
        </select>
        <small className="field-help">Must match the network selected in your wallet extension.</small>
      </div>

      <div className="form-section">
        <span className="field-label">Current contract</span>
        <p className="intro-copy" style={{ margin: 0 }}>
          {contractAddress ? (
            <>
              <code>{contractAddress}</code>
              <br />
              Status: {initialized ? "initialized" : "deployed / not initialized"}
            </>
          ) : (
            "None bound yet."
          )}
        </p>
        {contractAddress && (
          <button className="secondary-button" style={{ marginTop: 12 }} disabled={disabled} onClick={onCleared}>
            Clear bound address
          </button>
        )}
      </div>

      <div className="form-section">
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>1. Deploy new contract</h2>
        <p className="intro-copy">Builds an unproven deploy tx, proves via your wallet, and waits for indexer confirmation.</p>
        <button className="primary-button" disabled={disabled || !isConnected} onClick={() => void handleDeploy()}>
          {working ? "Working…" : "Deploy time-locked vault"} <span>↗</span>
        </button>
      </div>

      <div className="form-section">
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>2. Or bind existing address</h2>
        <label className="field-label" htmlFor="contract-address">Contract address</label>
        <input
          id="contract-address"
          value={existingAddress}
          onChange={(e) => setExistingAddress(e.target.value)}
          placeholder="Paste Midnight contract address"
          disabled={disabled}
        />
        <button className="secondary-button" style={{ marginTop: 12 }} disabled={disabled || !isConnected} onClick={() => void handleBind()}>
          Use this address
        </button>
      </div>

      <div className="form-section">
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>3. Initialize treasury</h2>
        <label className="field-label" htmlFor="treasury">Treasury (32-byte hex)</label>
        <input
          id="treasury"
          value={treasuryHex}
          onChange={(e) => setTreasuryHex(e.target.value.trim())}
          disabled={disabled}
        />
        <small className="field-help">64 hex characters. Default is a random local treasury key for Wave 1.</small>
        <button
          className="primary-button"
          style={{ marginTop: 12 }}
          disabled={disabled || !isConnected || !contractAddress || initialized}
          onClick={() => void handleInitialize()}
        >
          {initialized ? "Already initialized" : "Initialize contract"} <span>↗</span>
        </button>
      </div>

      {status && <div className="privacy-callout"><div><strong>Status</strong><p>{status}</p></div></div>}
      {error && <div className="form-errors"><div>! {error}</div></div>}
    </section>
  );
}
