import assert from "node:assert/strict";
import { describe, it } from "node:test";

const NOW = Date.parse("2026-09-14T12:00:00.000Z");

function validate(values: { amount: string; unlockDate: string; unlockTime: string; lockType: string; penaltyPercent: string }, now = Date.now()) {
  const errors = [];
  if (!values.amount.trim()) errors.push("Enter an amount.");
  else if (!/^\d+$/.test(values.amount.trim()) || BigInt(values.amount) <= 0n) errors.push("Amount must be a whole number greater than zero.");
  const unlock = new Date(`${values.unlockDate}T${values.unlockTime}`);
  if (!values.unlockDate || !values.unlockTime || Number.isNaN(unlock.getTime())) errors.push("Choose an unlock date and time.");
  else if (unlock.getTime() <= now) errors.push("Unlock time must be in the future.");
  if (values.lockType === "PENALTY" && (!Number.isFinite(Number(values.penaltyPercent)) || Number(values.penaltyPercent) < 0 || Number(values.penaltyPercent) > 100)) {
    errors.push("Penalty rate must be between 0% and 100%.");
  }
  return errors;
}

describe("create vault validation", () => {
  it("requires an amount", () => {
    assert.ok(validate({ amount: "", unlockDate: "2026-09-15", unlockTime: "18:00", lockType: "STRICT", penaltyPercent: "0" }, NOW).includes("Enter an amount."));
  });

  it("rejects dates in the past", () => {
    assert.ok(validate({ amount: "100", unlockDate: "2026-09-14", unlockTime: "11:00", lockType: "STRICT", penaltyPercent: "0" }, NOW).includes("Unlock time must be in the future."));
  });

  it("rejects penalty values above one hundred percent", () => {
    assert.ok(validate({ amount: "100", unlockDate: "2026-09-15", unlockTime: "18:00", lockType: "PENALTY", penaltyPercent: "100.01" }, NOW).includes("Penalty rate must be between 0% and 100%."));
  });

  it("accepts valid penalty values within range", () => {
    const errors = validate({ amount: "100", unlockDate: "2026-09-15", unlockTime: "18:00", lockType: "PENALTY", penaltyPercent: "50" }, NOW);
    assert.equal(errors.length, 0);
  });

  it("rejects negative penalty values", () => {
    assert.ok(validate({ amount: "100", unlockDate: "2026-09-15", unlockTime: "18:00", lockType: "PENALTY", penaltyPercent: "-1" }, NOW).includes("Penalty rate must be between 0% and 100%."));
  });

  it("requires unlock date and time", () => {
    assert.ok(validate({ amount: "100", unlockDate: "", unlockTime: "", lockType: "STRICT", penaltyPercent: "0" }, NOW).includes("Choose an unlock date and time."));
  });
});