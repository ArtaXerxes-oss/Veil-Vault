import { MAX_PENALTY_BPS } from "./contract";
import type { LockType } from "../types";

export interface CreateFormValues {
  asset: string;
  amount: string;
  unlockDate: string;
  unlockTime: string;
  lockType: LockType;
  penaltyPercent: string;
}

export function validateCreateForm(values: CreateFormValues, now = Date.now()): string[] {
  const errors: string[] = [];
  if (!values.asset.trim()) errors.push("Select an asset.");
  if (!values.amount.trim()) {
    errors.push("Enter an amount.");
  } else if (!/^\d+$/.test(values.amount.trim()) || BigInt(values.amount) <= 0n) {
    errors.push("Amount must be a whole number greater than zero.");
  }

  const unlock = new Date(`${values.unlockDate}T${values.unlockTime}`);
  if (!values.unlockDate || !values.unlockTime || Number.isNaN(unlock.getTime())) {
    errors.push("Choose an unlock date and time.");
  } else if (unlock.getTime() <= now) {
    errors.push("Unlock time must be in the future.");
  }

  if (values.lockType === "PENALTY") {
    const percent = Number(values.penaltyPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > MAX_PENALTY_BPS / 100) {
      errors.push("Penalty rate must be between 0% and 100%.");
    }
  }
  return errors;
}

export function percentToBps(percent: string): number {
  return Math.round(Number(percent) * 100);
}