import { Link } from "../App";
import { formatUnits } from "../lib/format";
import type { Vault } from "../types";
import { VaultCard } from "../components/VaultCard";

interface DashboardProps {
  vaults: Vault[];
  now: number;
  onOpen: (id: number) => void;
  treasury: { address: string; balance: bigint };
}

export function Dashboard({ vaults, now, onOpen, treasury }: DashboardProps) {
  const active = vaults.filter((vault) => vault.vaultState !== "WITHDRAWN" && vault.vaultState !== "PENALTY_EXECUTED");
  const ready = active.filter((vault) => vault.unlockTime <= now);
  const withdrawn = vaults.filter((vault) => vault.vaultState === "WITHDRAWN" || vault.vaultState === "PENALTY_EXECUTED");

  return (
    <>
      <section className="page-intro dashboard-intro">
        <div>
          <p className="section-kicker">PRIVATE VAULTS</p>
          <h1>Value, on your terms.</h1>
          <p className="intro-copy">Lock an asset until your conditions are satisfied. The contract handles the rules; your balance stays private.</p>
        </div>
        <Link href="#/create" className="primary-button">Create vault <span>↗</span></Link>
      </section>

      <section className="metric-grid">
        <div className="metric-card"><span className="metric-label">Active vaults</span><strong>{active.length}</strong><span className="metric-note">In your control</span></div>
        <div className="metric-card emphasis"><span className="metric-label">Ready to withdraw</span><strong>{ready.length}</strong><span className="metric-note">Conditions satisfied</span></div>
        <div className="metric-card"><span className="metric-label">Settled vaults</span><strong>{withdrawn.length}</strong><span className="metric-note">Permanently withdrawn</span></div>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><p className="section-kicker">YOUR VAULTS</p><h2>Private positions</h2></div><span className="count-label">{vaults.length} total</span></div>
        {vaults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit">⌁</div>
            <h3>Your first vault starts here.</h3>
            <p>Choose an asset, set the unlock condition, and let VEIL hold the rules.</p>
            <Link href="#/create" className="secondary-button">Create your first vault <span>→</span></Link>
          </div>
        ) : (
          <div className="vault-grid">{vaults.map((vault) => <VaultCard key={vault.id} vault={vault} now={now} onOpen={onOpen} />)}</div>
        )}
      </section>

      <section className="how-it-works">
        <div><p className="section-kicker">HOW IT WORKS</p><h2>Private by design.</h2></div>
        <div className="steps">
          <div className="step"><span>01</span><h3>Create</h3><p>Choose the asset, amount, and unlock condition.</p></div>
          <div className="step"><span>02</span><h3>Lock</h3><p>Your vault stays protected until its conditions are met.</p></div>
          <div className="step"><span>03</span><h3>Withdraw</h3><p>Exit at unlock, or early under the penalty policy.</p></div>
        </div>
      </section>
      <section className="treasury-strip">
        <div><p className="section-kicker">TREASURY</p><h2>Protocol accounting</h2><p>Early-exit penalties settle here. No governance or staking is part of Wave 1.</p></div>
        <div className="treasury-balance"><span>COLLECTED PENALTIES</span><strong>{formatUnits(treasury.balance)} <small>units</small></strong><em>{treasury.address}</em></div>
      </section>
    </>
  );
}