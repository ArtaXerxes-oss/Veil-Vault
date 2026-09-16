# VEIL Vault threat model

## Unauthorized withdrawal

**Attack:** an account attempts to withdraw another user's vault.  
**Defense:** the contract checks the caller against the vault owner proof (witness-derived commitment) before any transfer or state mutation. This follows the witness-derived keypair pattern from the Example ZK Loan reference.

## Early strict withdrawal

**Attack:** an owner tries to withdraw a strict vault before its unlock time.  
**Defense:** the contract checks ledger time and rejects the transaction. Frontend countdowns are advisory only. The state machine prevents transitioning from LOCKED to WITHDRAWN for strict vaults before unlock.

## Double withdrawal

**Attack:** a user resubmits a successful withdrawal.  
**Defense:** the contract changes the vault from LOCKED to WITHDRAWN and rejects every later withdrawal. The state machine ensures a vault can only transition once.

## Penalty manipulation

**Attack:** a caller submits a negative, oversized, or inconsistent penalty.  
**Defense:** penalty rates use unsigned basis points and must be <= 10,000; the contract calculates the amount itself. The Compact contract enforces `penaltyBps <= MAX_PENALTY_BPS`.

## Invalid vault creation

**Attack:** an attacker creates a zero-value vault, a past unlock, or an unsupported mode.  
**Defense:** all creation inputs are validated by the contract model and must be repeated in Compact. The Compact contract asserts `amount > 0`, `unlockTime > ledgerCurrentTime()`, `lockType` is valid, and `penaltyBps <= MAX_PENALTY_BPS`.

## Private-data leakage

**Attack:** the application exposes balances or authorization data through ordinary public state or UI telemetry.  
**Defense:** amounts and owner authorization are treated as private state/proof inputs; the UI uses a private placeholder by default. The production deployment must audit ledger fields, events, logs, and wallet payloads together. The Compact contract keeps `vaultAmount` and `ownerCommitment` as private witnesses, not public ledger fields.

## Simulator confusion

**Risk:** a user mistakes local demo state for a deployed Midnight transaction.  
**Defense:** the wallet control, README, and transaction status surface explicitly label the simulator. The production adapter should replace the simulator before deployment.

## State machine integrity

**Attack:** a caller attempts to bypass the state machine by submitting invalid transitions.  
**Defense:** the Compact contract uses `VaultState` enum assertions to prevent invalid transitions. The state machine follows the Midnight Escrow pattern: EMPTY → LOCKED → READY → WITHDRAWN, with PENALTY_EXECUTED as an intermediate state for early penalty withdrawals.
