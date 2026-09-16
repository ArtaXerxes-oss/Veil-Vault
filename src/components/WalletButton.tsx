import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";

export function WalletButton() {
  const {
    isConnected,
    isConnecting,
    address,
    walletType,
    walletStatus,
    network,
    connect,
    disconnect,
    error,
    availableWallets,
  } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  const walletLabel =
    walletType === "1am"
      ? "1AM"
      : walletType === "lace"
        ? "Lace"
        : "Wallet";

  if (walletStatus === "checking") {
    return (
      <button className="wallet-button connecting" disabled>
        Checking wallet…
      </button>
    );
  }

  if (isConnecting) {
    return (
      <button className="wallet-button connecting" disabled>
        Connecting…
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="wallet-menu">
        <div className="wallet-connected-row">
          <button
            className="wallet-button connected"
            onClick={() => void connect()}
            title="Request a fresh approval from your wallet"
          >
            <span className="wallet-dot" />
            <span>{walletLabel}</span>
            <span className="wallet-button-label">{shorten(address)}</span>
            <span className="wallet-chevron">↻</span>
          </button>
          <button
            className="wallet-button connected wallet-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Wallet options"
            aria-expanded={menuOpen}
          >
            <span className="wallet-chevron">⌄</span>
          </button>
        </div>
        {menuOpen && (
          <>
            <div className="wallet-dropdown-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="wallet-dropdown">
              <div className="wallet-dropdown-addr">
                <span className="wallet-dropdown-addr-label">
                  Connected as · {walletLabel} · {network}
                </span>
                <span className="wallet-dropdown-addr-value">{address}</span>
              </div>
              <div className="wallet-dropdown-divider" />
              <button
                className="wallet-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  void connect();
                }}
              >
                <span className="wallet-dropdown-icon">↻</span>
                Re-approve connection
                <span className="wallet-hint" style={{ margin: 0, marginLeft: "auto" }}>
                  Always prompts
                </span>
              </button>
              <button
                className="wallet-dropdown-item wallet-dropdown-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  disconnect();
                }}
              >
                <span className="wallet-dropdown-icon">⊘</span>
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-menu">
      <button className="wallet-button" onClick={() => void connect()}>
        Connect Midnight wallet <span>↗</span>
      </button>
      {walletStatus === "not-found" && (
        <span className="wallet-hint">
          Install 1AM or Lace
        </span>
      )}
      {walletStatus === "detected" && availableWallets.length > 0 && (
        <span className="wallet-hint">
          Detected: {availableWallets.join(", ")}
        </span>
      )}
      {error && (
        <span className="wallet-hint wallet-hint--error">
          {error}
        </span>
      )}
    </div>
  );
}

function shorten(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}