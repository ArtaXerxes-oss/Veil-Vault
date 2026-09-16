import type { LockType, VaultState, VaultStatus } from "../types";

export function formatUnits(value: bigint): string {
  return value.toLocaleString("en-US");
}

export function formatDate(timestamp: number, includeTime = true): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(new Date(timestamp));
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short"
  }).format(new Date(timestamp));
}

export function formatPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function labelForLockType(lockType: LockType): string {
  return lockType === "STRICT" ? "Strict" : "Penalty";
}

export function labelForStatus(status: VaultStatus, unlockTime: number, now = Date.now()): string {
  if (status === "WITHDRAWN") return "Withdrawn";
  return now >= unlockTime ? "Ready" : "Locked";
}

export function labelForVaultState(vaultState: VaultState): string {
  switch (vaultState) {
    case "EMPTY": return "Empty";
    case "LOCKED": return "Locked";
    case "READY": return "Ready";
    case "WITHDRAWN": return "Withdrawn";
    case "PENALTY_EXECUTED": return "Penalty Executed";
    default: return vaultState;
  }
}

export function timeRemaining(unlockTime: number, now = Date.now()): string {
  const totalSeconds = Math.max(0, Math.floor((unlockTime - now) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}