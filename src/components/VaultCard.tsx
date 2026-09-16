import { formatDate, labelForLockType } from "../lib/format";
import type { Vault } from "../types";
import { VaultStatus } from "./VaultStatus";

interface VaultCardProps {
  vault: Vault;
  now: number;
  onOpen: (id: number) => void;
}

export function VaultCard({ vault, now, onOpen }: VaultCardProps) {
  return (
    <article className="vault-card">
      <div className="card-topline">
        <span className="eyebrow">VAULT #{String(vault.id).padStart(3, "0")}</span>
        <VaultStatus vaultState={vault.vaultState} unlockTime={vault.unlockTime} now={now} compact />
      </div>
      <div className="private-balance">
        <span className="lock-mark">⌁</span>
        <div>
          <span className="muted-label">Balance</span>
          <strong>PRIVATE</strong>
        </div>
      </div>
      <dl className="card-meta">
        <div><dt>Asset</dt><dd>{vault.asset}</dd></div>
        <div><dt>Unlock</dt><dd>{formatDate(vault.unlockTime)}</dd></div>
        <div><dt>Mode</dt><dd>{labelForLockType(vault.lockType)}</dd></div>
      </dl>
      <button className="text-button" onClick={() => onOpen(vault.id)}>View vault <span>→</span></button>
    </article>
  );
}
