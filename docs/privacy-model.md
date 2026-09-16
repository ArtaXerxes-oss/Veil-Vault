# VEIL Vault privacy model

Privacy is a contract property, not a CSS treatment. The local UI masks balances so a visitor understands the product intent, while the production Compact contract must keep the corresponding financial state private and prove the required conditions.

| Field / fact | Intended visibility | Reason |
| --- | --- | --- |
| Vault ID | Public commitment | The UI needs a stable reference for a vault. |
| Lifecycle status | Public commitment | Other parties may need to know whether a vault is active or settled without seeing its balance. |
| Unlock condition | Public or committed according to deployment | The owner needs a usable timer; the final Compact design should expose no more than the protocol requires. |
| Asset identifier | Public or committed according to asset design | The UI needs to identify the asset, but an asset-specific deployment may choose a commitment. |
| Amount | Private | A vault should not reveal the user's balance or financial position merely because a vault exists. |
| Owner authorization material | Private | Withdrawal should prove ownership without publishing sensitive authorization data. |
| Penalty result | Revealed only as required for settlement | The contract must prove the arithmetic and treasury transfer; the user's full position need not become public. |

## What creation proves

Creation proves that the caller is authorized to establish a valid vault, the amount is positive, the unlock time is valid, the mode is supported, and the penalty is within the protocol maximum. The production proof flow should commit the private amount and owner information rather than publishing them as ordinary ledger fields. This follows the witness-derived identity pattern from the Example ZK Loan reference.

## What withdrawal proves

Withdrawal proves that the caller controls the vault, that the vault is still active, and that the selected policy allows settlement at the current time. For an early penalty withdrawal, the contract proves:

```text
penalty = amount × penaltyBps / 10,000
ownerAmount = amount - penalty
```

The vault is then marked withdrawn so the same commitment cannot be spent twice. The state machine transitions from LOCKED → WITHDRAWN or LOCKED → PENALTY_EXECUTED → WITHDRAWN.

## Current package boundary

The included browser demo is not a privacy-preserving ledger. It is an honest, testable reference implementation with a wallet adapter seam. The Compact state declarations and official Midnight proof APIs must be pinned and compiled before calling the system production-ready. The wallet adapter seam in `src/lib/wallet.ts` follows the `@midnight-ntwrk/wallet-sdk` pattern from the Midnight Local Dev reference.
