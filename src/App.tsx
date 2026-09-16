import { useEffect, useState, type ReactNode } from "react";
import { WalletButton } from "./components/WalletButton";
import { TransactionStatus } from "./components/TransactionStatus";
import { useWallet } from "./contexts/WalletContext";
import { useVaultApp } from "./lib/useVaultApp";
import { loadTxLog } from "./lib/midnight";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CreateVault } from "./pages/CreateVault";
import { History } from "./pages/History";
import { VaultDetails } from "./pages/VaultDetails";
import { DeployPage } from "./pages/Deploy";

export function Link({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <a href={href} className={className}>{children}</a>;
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const listener = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const wallet = useWallet();
  const app = useVaultApp();
  const path = route.replace(/^#/, "") || "/";
  const detailMatch = path.match(/^\/vault\/(\d+)$/);
  const isLanding = path === "/" || path === "";

  function openVault(id: number) {
    window.location.hash = `#/vault/${id}`;
  }

  function onCreated(id: number) {
    window.location.hash = `#/vault/${id}`;
  }

  const createReady = Boolean(app.contractAddress && app.initialized && wallet.isConnected);
  const createHint = !wallet.isConnected
    ? "Connect 1AM/Lace (preprod) to submit real wallet transactions."
    : !app.contractAddress
      ? "No contract bound. Open Deploy to deploy or bind the vault contract."
      : !app.initialized
        ? 'Bound contract is deployed but not initialized on-chain. Open Deploy and press "Initialize contract".'
        : "";
  const createButtonLabel = !wallet.isConnected
    ? "Connect wallet to create"
    : !app.contractAddress
      ? "Bind contract to create"
      : !app.initialized
        ? "Initialize to create"
        : "Create vault";

  return (
    <div className="app-shell">
      <div className="grain" />
      <header className="topbar">
        <Link href="#/" className="brand">
          <span>VEIL</span>
          <small>VAULT</small>
        </Link>
        <nav className="main-nav">
          <Link href="#/" className={isLanding ? "active" : ""}>Home</Link>
          <Link href="#/app" className={path === "/app" ? "active" : ""}>Vaults</Link>
          <Link href="#/create" className={path === "/create" ? "active" : ""}>Create</Link>
          <Link href="#/deploy" className={path === "/deploy" ? "active" : ""}>Deploy</Link>
          <Link href="#/history" className={path === "/history" ? "active" : ""}>History</Link>
        </nav>
        <WalletButton />
      </header>

      {isLanding ? (
        <>
          <main className="main-content landing-wrap">
            <Landing />
          </main>
          <footer className="footer landing-footer">
            <span>VEIL VAULT</span>
            <span>Private time-locks on Midnight · preprod</span>
          </footer>
        </>
      ) : (
        <>
          <main className="main-content">
            {!wallet.isConnected && (
              <section className="connect-banner">
                <div>
                  <span className="banner-icon">⌁</span>
                  <div>
                    <strong>Connect 1AM or Lace</strong>
                    <p>Real Midnight wallet connection is required on preprod.</p>
                  </div>
                </div>
                <button className="secondary-button" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
                  {wallet.isConnecting ? "Connecting…" : "Connect wallet"} <span>↗</span>
                </button>
              </section>
            )}

            {wallet.isConnected && !app.contractAddress && path !== "/deploy" && (
              <section className="connect-banner">
                <div>
                  <span className="banner-icon">⌁</span>
                  <div>
                    <strong>No contract bound</strong>
                    <p>Deploy the Compact vault or paste an existing contract address.</p>
                  </div>
                </div>
                <Link href="#/deploy" className="secondary-button">Open deploy <span>↗</span></Link>
              </section>
            )}

            {app.statusMessage && (
              <section className="connect-banner">
                <div><strong>Transaction in progress</strong><p>{app.statusMessage}</p></div>
              </section>
            )}

            <TransactionStatus notice={app.notice} onDismiss={app.dismissNotice} />

            {path === "/deploy" ? (
              <DeployPage
                contractAddress={app.contractAddress}
                initialized={app.initialized}
                busy={app.busy}
                onBound={(address) => {
                  app.bindContractAddress(address);
                  app.reloadTxLog();
                }}
                onCleared={app.clearBoundContract}
                onInitialized={async () => {
                  await app.refresh();
                  app.reloadTxLog();
                }}
                onTxLogged={() => {
                  app.reloadTxLog();
                }}
              />
            ) : path === "/create" ? (
              <CreateVault
                onCreate={app.createVault}
                onCreated={onCreated}
                busy={app.busy}
                ready={createReady}
                hint={createHint}
                buttonLabel={createButtonLabel}
              />
            ) : path === "/history" ? (
              <History transactions={app.transactions.length ? app.transactions : loadTxLog()} />
            ) : detailMatch ? (
              <VaultDetails
                vault={app.vaults.find((vault) => vault.id === Number(detailMatch[1]))}
                now={app.now}
                busy={app.busy}
                onWithdraw={app.withdrawVault}
                onWithdrawWithPenalty={app.withdrawWithPenalty}
              />
            ) : (
              <Dashboard vaults={app.vaults} now={app.now} onOpen={openVault} treasury={app.treasury} />
            )}
          </main>

          <footer className="footer">
            <span>VEIL VAULT · WAVE 1</span>
            <span>
              <i className="online-dot" />{" "}
              {wallet.isConnected
                ? `${wallet.walletType ?? "wallet"} · ${wallet.network}${app.contractAddress ? ` · ${app.contractAddress.slice(0, 10)}…` : ""}`
                : "wallet disconnected"}
            </span>
          </footer>
        </>
      )}
    </div>
  );
}
