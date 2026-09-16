# VEIL Vault architecture

```text
USER
  │
  ▼
MIDNIGHT WALLET / DEMO WALLET ADAPTER
  │
  ▼
VEIL REACT FRONTEND
  │
  ▼
TIME-LOCKED VAULT CONTRACT
  ├── Vault state machine: EMPTY → LOCKED → READY → WITHDRAWN | PENALTY_EXECUTED
  ├── Owner authorization (witness-derived)
  ├── Time conditions
  ├── Penalty calculation
  ├── Treasury accounting
  └── One-time withdrawal
  │
  ▼
MIDNIGHT LEDGER
```

## Runtime layers

### UI

The dashboard, create form, detail screen, and history screen only collect input and render state. They can disable a button for better UX, but they do not authorize a withdrawal.

### Contract model and contract boundary

`src/lib/contract.ts` is a deterministic reference model used by the demo and tests. It owns the domain rules: initialization, validation, authorization, unlock checks, penalty math, treasury updates, and lifecycle transitions. `contracts/time-locked-vault/time_locked_vault.compact` is the deployment boundary for the Midnight implementation.

### Wallet adapter

`src/lib/wallet.ts` exposes the small interface the UI needs: connect, disconnect, and a current owner address. The included adapter gives a clearly labelled simulator so the product can be evaluated without a browser wallet. A production adapter should call the official Midnight wallet and proof APIs, following the pattern from `@midnight-ntwrk/wallet-sdk`.

### Persistence

The local demo serializes its reference-model state to `localStorage`. This is only for a repeatable demo; it is not a substitute for ledger persistence.

## State machine

The vault follows a state machine inspired by the Midnight Escrow reference:

```text
EMPTY
  ↓
LOCKED
  ├──→ READY → WITHDRAWN
  │
  └──→ EARLY_WITHDRAWAL
             ↓
         PENALTY_EXECUTED → WITHDRAWN
```

This state machine is implemented in both the Compact contract (`time_locked_vault.compact`) and the reference model (`src/lib/contract.ts`).

## Reference repos

This project draws from the following Midnight ecosystem repos:

- **Create Midnight App** — project scaffolding and deployment structure
- **Midnight Escrow** — asset-locking/state-machine architecture
- **Example ZK Loan** — private financial state and ZK validation patterns
- **Midnight Local Dev** — local network/testing environment
- **Midnight Wallet SDK** — wallet and transaction functionality
- **OpenZeppelin Compact Contracts** — reusable Compact contract primitives
- **Compact Tools** — compile and build tooling
- **Midnight Doctor** — environment/version validation
