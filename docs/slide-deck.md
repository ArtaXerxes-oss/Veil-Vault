# VEIL Vault — Buildathon Slide Deck (Wave 2)

Pitch: https://gamma.app/docs/VEIL-Vault-ypg0jo0ifligaen
Submit via AKINDO with repo + video: `https://youtu.be/dyCqXgBnkgE`
License: Apache-2.0 (`LICENSE`). Topics: `midnightntwrk, midnight, compact`.

## 1. Problem
Time-locked custody on transparent chains leaks owner, amount, and terms. Inheritance / escrow needs enforceable release without a custodian.

## 2. Solution
Private time-locked vault on Midnight: Compact circuits enforce `EMPTY → LOCKED → WITHDRAWN / PENALTY_EXECUTED`. Prove ownership + terms in ZK, disclose only lifecycle.

## 3. Live product loop
Connect 1AM/Lace (preprod) → Deploy `TimeLockedVault` → Initialize treasury → `createVault(amount, unlockTime, STRICT|PENALTY)` → early strict rejects → withdraw after unlock or `withdrawWithPenalty` early.

Default preprod: `ca572dfc83d9eef244fdecc3becb0cc03ed56f6590f28cceaabee5c9688ba3ed`
If `initialized=false`, open `#/deploy` → Initialize treasury (signed tx). See `docs/DEPLOY-CHECKLIST.md`.

## 4. Architecture
`pages → useVaultApp → src/lib/vaultContract.ts → midnight.ts providers → contracts/managed/.../contract/index.js → wallet/indexer/proof-server`
Source: `contracts/time-locked-vault/time_locked_vault.compact` (8 circuits). Compiled `0.31.1 / lang 0.23.0 / runtime 0.16.0`.

## 5. Privacy model
Ledger (`disclose`) vs witnesses (never on-chain). See `README.md` Privacy table + `docs/privacy-model.md`.
Known Wave 1 limitation: `vaultAmount` is `disclose(amt)` (`time_locked_vault.compact:120`). Wave 2 moves to commitment-only. Terms integrity via `persistentCommit([amt, unlockTime, lockType, penaltyBps], nonce)`.

## 6. Engineering proof
`compact compile` exits 0, 8 circuits, 16 keys + 16 zkir. `npm run typecheck`, `npm test`, `npm run build` green. Tests: TS model (`tests/time-locked-vault/contract.test.ts`), validation, simulation (`simulation.test.ts`), artifacts (`contract-artifacts.test.ts`).

## 7. UX
`#/ /#/app /#/create /#/deploy /#/vault/:id /#/history`. Sensitive values masked `PRIVATE` by default. Private meta export/import added (`vaultContract.ts: exportPrivateMeta / importPrivateMeta`) — backup before switching browsers, withdrawals need original `secretKey+nonce`.

## 8. Business viability
Audience: DAO treasuries, payroll lockups, inheritance custodians. Path: Wave 2 tDUST shielded value + encrypted secrets, Wave 3 N-of-M escrow + audit → mainnet. See `README.md` Roadmap.

## 9. Attribution
Built on Create Midnight App, Midnight Escrow state-machine, ZK Loan patterns, Wallet SDK, Compact Tools, OpenZeppelin Compact primitives. Midnight indexer preprod for reads.

## 10. Ask
Wave 3 grant to ship commitment-only amounts, shielded Dust settlement, and audited mainnet deploy. Initialize the bound contract and try strict-reject → unlock-withdraw live.
