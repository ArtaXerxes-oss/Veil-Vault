import { Link } from "../App";
import { formatDate, formatPercent, labelForLockType, labelForVaultState, timeRemaining, formatUnits } from "../lib/format";
import type { Vault } from "../types";
import { VaultStatus } from "../components/VaultStatus";

interface VaultDetailsProps {
  vault: Vault | undefined;
  now: number;
  busy?: boolean;
  onWithdraw: (id: number) => Promise<unknown>;
  onWithdrawWithPenalty: (id: number) => Promise<unknown>;
}

export function VaultDetails({ vault, now, busy = false, onWithdraw, onWithdrawWithPenalty }: VaultDetailsProps) {
  if (!vault) {
    return (
      <section className="empty-state page-empty">
        <h3>Vault not found.</h3>
        <p>That vault is not in the on-chain ledger for the bound contract.</p>
        <Link href="#/" className="secondary-button">Back to vaults</Link>
      </section>
    );
  }

  const statusLabel = labelForVaultState(vault.vaultState);
  const canWithdraw = vault.vaultState === "LOCKED" || vault.vaultState === "READY";
  const isEarlyPenalty = vault.lockType === "PENALTY" && now < vault.unlockTime && vault.vaultState !== "WITHDRAWN";

  return (
    <section className="narrow-page detail-page">
      <Link href="#/" className="back-link">← Back to vaults</Link>
      <div className="detail-header">
        <div>
          <p className="section-kicker">VAULT #{String(vault.id).padStart(3, "0")}</p>
          <h1>Protected position</h1>
        </div>
        <VaultStatus vaultState={vault.vaultState} unlockTime={vault.unlockTime} now={now} />
      </div>
      <div className="balance-panel">
        <div className="balance-symbol">⌁</div>
        <p className="section-kicker">VAULT BALANCE</p>
        <h2>Private information</h2>
        <p>Settlement requires your wallet to prove ownership via Compact witnesses.</p>
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span>Status</span><strong>{statusLabel}</strong></div>
        <div className="detail-row"><span>Unlock</span><strong>{formatDate(vault.unlockTime)}</strong></div>
        <div className="detail-row">
          <span>Withdrawal rule</span>
          <strong>
            {labelForLockType(vault.lockType)}
            {vault.lockType === "PENALTY" && ` · ${formatPercent(vault.penaltyBps)}`}
          </strong>
        </div>
        <div className="detail-row"><span>Asset</span><strong>{vault.asset}</strong></div>
        <div className="detail-row"><span>Owner</span><strong>YOU</strong></div>
      </div>
      <div className="withdrawal-panel">
        <div>
          <p className="section-kicker">WITHDRAWAL</p>
          {vault.vaultState === "WITHDRAWN" ? (
            <><h3>Settled permanently.</h3><p>This vault has already been withdrawn.</p></>
          ) : vault.vaultState === "PENALTY_EXECUTED" ? (
            <><h3>Penalty executed.</h3><p>This vault was withdrawn early with a penalty applied.</p></>
          ) : vault.vaultState === "LOCKED" && vault.lockType === "STRICT" ? (
            <><h3>Unavailable until unlock.</h3><p>Unlocks in <strong>{timeRemaining(vault.unlockTime, now)}</strong>.</p></>
          ) : isEarlyPenalty ? (
            <><h3>Early exit available.</h3><p>This withdrawal will send <strong>{formatUnits((vault.amount * BigInt(vault.penaltyBps)) / 10000n)} units</strong> to treasury as the protocol penalty.</p></>
          ) : (
            <><h3>Conditions satisfied.</h3><p>The vault can now be withdrawn at full value.</p></>
          )}
        </div>
        {vault.vaultState === "WITHDRAWN" || vault.vaultState === "PENALTY_EXECUTED" ? (
          <span className="settled-check">
            {vault.vaultState === "WITHDRAWN" ? "WITHDRAWN ✓" : "PENALTY EXECUTED ✓"}
          </span>
        ) : (
          <button
            className="primary-button"
            disabled={!canWithdraw || busy}
            onClick={() => void (isEarlyPenalty ? onWithdrawWithPenalty(vault.id) : onWithdraw(vault.id))}
          >
            {busy ? "Awaiting wallet…" : isEarlyPenalty ? "Withdraw with penalty" : "Withdraw"} <span>↗</span>
          </button>
        )}
      </div>
    </section>
  );
}
