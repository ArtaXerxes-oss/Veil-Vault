import { labelForVaultState } from "../lib/format";
import type { VaultState } from "../types";

interface VaultStatusProps {
  vaultState: VaultState;
  unlockTime: number;
  now?: number;
  compact?: boolean;
}

export function VaultStatus({ vaultState, unlockTime, now = Date.now(), compact = false }: VaultStatusProps) {
  const label = vaultState === "WITHDRAWN" ? "Withdrawn" : labelForVaultState(vaultState);
  const className = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <span className={`status-pill ${className} ${compact ? "compact" : ""}`}>
      <span className="status-icon">{vaultState === "WITHDRAWN" || vaultState === "PENALTY_EXECUTED" ? "✓" : "◒"}</span>
      {label.toUpperCase()}
    </span>
  );
}
