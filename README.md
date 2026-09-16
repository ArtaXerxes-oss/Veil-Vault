# VEIL Vault

**VEIL Vault** is a private, time-locked asset vault for the [Midnight](https://midnight.network) blockchain. It is Wave 1 of a fintech product loop: connect a real Midnight wallet (1AM/Lace), deploy and initialize a real **Compact** contract, create private vaults via a real `createVault` circuit call, and withdraw on time or exit early with a penalty.

The frontend talks directly to the live chain — no simulation. Balances and ownership live in Compact **private state**; commitments, vault counters, treasury, and lifecycle status are readable from the Midnight indexer.

> **Current deployment status:** a real contract is deployed on **preprod** and wired into the app by default. It is *deployed but not yet initialized* — initialize it from the **Deploy** page (`#/deploy`) once you've connected your wallet.

---

## Product loop

1. Connect a Midnight wallet (1AM or Lace) on **preprod**.
2. **Deploy** the compiled `TimeLockedVault` Compact contract (or bind an existing address) and **initialize** a treasury.
3. **Create a vault** — pick an asset label, amount, unlock date/time, and withdrawal rule (`STRICT` or `PENALTY`). This submits a real `createVault` circuit call through your wallet (prove → balance → submit).
4. **Attempt an early strict withdrawal** and watch the contract reject it.
5. **Withdraw** after unlock, or exit a penalty vault early and pay `penaltyBps`.
6. See the vault become permanently withdrawn (`WITHDRAWN` / `PENALTY_EXECUTED`) and review its transaction history.

The visual layer is intentionally quiet and financial: sensitive values are shown as `PRIVATE` by default, while lifecycle state stays easy to inspect.

---

## Deployed contract

| Field | Value |
|---|---|
| Address | `ca572dfc83d9eef244fdecc3becb0cc03ed56f6590f28cceaabee5c9688ba3ed` |
| Network | **preprod** (verified live — preprod indexer returns state; preview returns none) |
| Status | Deployed, **not initialized** (`initialized=false`, `treasury=0x00…00`, `vaultCounter=0`) |
| Bound by | `.env.local` → `VITE_CONTRACT_ADDRESS` with a hardcoded fallback `DEFAULT_CONTRACT_ADDRESS` |

The address is bound automatically on startup (saved localStorage wins, then env, then the code fallback), so the **Deploy** page already shows it as the current contract. The only remaining step is **Initialize contract** — a real signed transaction that only your wallet can produce.

---

## Architecture

The app keeps two deliberately separate layers:

- **`src/lib/contract.ts`** — an executable reference model of the Wave 1 authority (validation, lock modes, penalty, treasury accounting, private-state tracking). Used by the test suite only.
- **`contracts/time-locked-vault/time_locked_vault.compact`** — the actual Compact contract: state declaration, circuits, and queries. The frontend never replaces contract enforcement with a UI-only timer.

The live integration path is:

```
pages → useVaultApp → src/lib/vaultContract.ts → quoted providers (midnight.ts)
                                              → compiled contract (contracts/managed/…/contract/index.js)
                                              → wallet / indexer / proof server
```

### Compact contract

- Source: `contracts/time-locked-vault/time_locked_vault.compact`
- Compiled output: `contracts/managed/time-locked-vault/time_locked_vault/contract/index.js`
- ZK assets (synced to `public/contract/time-locked-vault/`): prover/verifier + zkir for all 8 circuits — `initialize`, `createVault`, `withdraw`, `withdrawWithPenalty`, and queries `isVaultInitialized`, `getTreasury`, `getTreasuryBalance`, `getVaultState`.
- Witnesses (`contracts/time-locked-vault/witnesses.ts`) map the `VeilVaultPrivateState` fields: `secretKey`, `amount`, `ownerProof`, `nonce`, `penalty`, `currentTime`.
- Compiled with compact compiler `0.31.1` / language `0.23.0` / runtime **`0.16.0`**.

### SDK stack

`compact-js@2.5.1` (pinned), `compact-runtime@0.16.0`, `midnight-js-contracts@4.1.1`, `ledger-v8@8.1.2` (single copy via override), `testkit-js@4.1.1`, `wallet-sdk@1.1.0` (facade 4.0.1 / dust-wallet 4.1.0 / shielded 3.0.1), `wallet-sdk-address-format@3.0.0`.

---

## Getting started

Requires Node.js **≥ 22**.

```bash
npm install
npm run dev            # syncs ZK assets, then starts Vite
```

Open the URL Vite prints (default `http://localhost:5173`).

### Environment

Create `.env.local` (git-ignored via `*.local`) and `.env`:

```ini
# .env.local — deployed contract bound on startup
VITE_CONTRACT_ADDRESS=ca572dfc83d9eef244fdecc3becb0cc03ed56f6590f28cceaabee5c9688ba3ed

# .env — default network for wallet.connect(...)
VITE_MIDNIGHT_NETWORK=preprod
```

Network (`preview | preprod | mainnet | undeployed`) must match the network selected inside your wallet extension. The wallet's `getConfiguration()` is the source of truth for node / indexer / proof-server endpoints at runtime.

### Wallet

Install and unlock **1AM** (recommended) or **Lace**. The app's wallet adapter lives in `src/contexts/WalletContext.tsx`. Connection approval is re-triggered on every connect click by design.

---

## Using the app

- **`#/`** — landing page.
- **`#/app`** — dashboard: real on-chain vaults, treasury address/balance, live status.
- **`#/create`** — new vault form. Editable at all times; the **submit button unlocks only when** you are connected, a contract is bound, *and* the contract is initialized (targeted hints tell you which step is missing).
- **`#/deploy`** — deploy a new contract, bind an existing address, or **initialize the treasury** (fetches real state from the indexer).
- **`#/vault/:id`** — vault detail: status (`EMPTY` → `LOCKED` → `READY` → `WITHDRAWN` / `PENALTY_EXECUTED`), strict withdraw, early penalty exit.
- **`#/history`** — transaction log (deploys, initializes, creates, withdrawals) persisted to `localStorage`.

Private vault metadata (amount, nonce, secret key) is scoped per contract address under `veil-vault-private-meta-v1:<address>`. Withdrawals require the original private state, so they only work from the browser that created the vault.

---

## Project map

```text
contracts/time-locked-vault/         Compact source + witnesses
contracts/managed/time-locked-vault/ Compiled contract (index.js, keys, zkir)
public/contract/time-locked-vault/   Prover/verifier + zkir assets served to the wallet
src/App.tsx                          Hash-routed shell
src/pages/                           Landing, Dashboard, CreateVault, VaultDetails, History, Deploy
src/components/                      WalletButton, CreateVaultForm, TransactionStatus, VaultCard, VaultStatus
src/lib/                             useVaultApp, vaultContract (live), midnight (providers), contract (model), validation, format
src/contexts/WalletContext.tsx       1AM/Lace session + provider wiring
tests/                               Contract + validation Wave 1 tests
docs/                                architecture.md, privacy-model.md, threat-model.md
scripts/                             deploy.ts, setup.ts
```

---

## Verification

```bash
npm run typecheck     # tsc --noEmit
npm test              # builds src/lib/contract.ts via esbuild, runs node --test
npm run build         # tsc -b && vite build
npm run lint          # eslint src
```

Recompile the Compact contract / resync ZK assets:

```bash
npm run compile       # compact compile …/time_locked_vault.compact
npm run sync:zk       # copy keys + zkir into public/
npm run build:contract
```

### Verifying on-chain state (read path)

The app's real read path — `createPatchedPublicDataProvider` → `contractAction(address) { state ... }` → `ContractState.deserialize` → compiled `ledger()` — decodes the deployed contract as:

```json
{ "initialized": false, "vaultCounter": 0, "treasuryBalance": "0",
  "treasury": "0000000000000000000000000000000000000000000000000000000000000000" }
```

Indexer endpoints (2026): `https://indexer.<preprod|preview|mainnet>.midnight.network/api/v4/graphql` (WebSocket at `/api/v4/graphql/ws`).

---

## Important engineering notes

- **Ledger-v8 dedupe (`_CostModel` error).** The old `expected instance of _CostModel / expected instance of ChargedState` runtime errors came from two `@midnight-ntwrk/ledger-v8` copies (8.1.2 top-level + 8.1.0 nested under `midnight-js-protocol`). Fixed with an npm override forcing the nested copy to **8.1.2**:

  ```json
  "overrides": { "@midnight-ntwrk/midnight-js-protocol": { "@midnight-ntwrk/ledger-v8": "8.1.2" } }
  ```

  After changing overrides, delete `node_modules` **and** `package-lock.json`, then `npm install` fresh. Verify with `npm ls ledger-v8` (must show a single `@midnight-ntwrk/ledger-v8@8.1.2`).

- **`compact-js` is pinned to exact `2.5.1`.** `2.5.3` depends on the unpublished `@midnight-ntwrk/ledger-v9@^0.1.0-alpha.1`, which makes `npm install` fail with `ETARGET`. Do not bump it.

- **Build target.** `vite-plugin-top-level-await` was removed from `vite.config.ts` and devDependencies: it crashed on `@swc/core` ("missing field `type`" in `printSync`). `build.target: "esnext"` already enables native top-level await output.

- **`Invalid Transaction: Custom error: 182`** = `TransactionApplicationError` in Midnight — the intent's TTL expired, or the same intent was submitted twice. Ensure the wallet is synced to the tip, and don't double-submit. Both preprod and preview run ledger `8.1.2` as of Sept 2026.

- **`import.meta.env` is guarded** in `src/lib/midnight.ts` (`DEFAULT_CONTRACT_ADDRESS`) so the module can also be imported under plain Node (scripts/probes), where Vite's `import.meta.env` is `undefined`.

- A `Buffer` polyfill is registered in `src/main.tsx` for legacy SDK paths.

---

## Privacy & security model

- Amounts and ownership are committed via the Compact witness model; the public ledger exposes only the vault structure, treasury, and lifecycle state.
- The UI masking of amounts with `PRIVATE` is a product-level representation, not a substitute for Midnight private state — see `docs/privacy-model.md`.
- Wave 1 intentionally does **not** move tokens: the asset field is a label, and the treasury is a random locally-generated 32-byte key. Real Dust/token transfer and shielded balances are pipeline items.
- The wallet approval flow re-triggers per action; the app never holds signing keys.

See `docs/architecture.md`, `docs/privacy-model.md`, and `docs/threat-model.md` for details.

---

## Roadmap

### Wave 2 — real value on real value rails

- **tDUST/DUST deposits backed by shielded balances** — replace the asset *label* with actual token
  transfers built on Midnight's shielded-balance primitives (dust-wallet / shielded sync), so a vault's
  amount is measurable in real value.
- **Encrypted unlock secrets instead of timestamps alone** — pair the time-lock with an encrypted secret
  the owner (and later executors) can reveal, enabling time- *or* secret-based release.
- **Commitment scheme hardening** — amounts and ownership move fully into ZK commitments (nonce-seeded
  `amountCommitment` style) so the public ledger proves membership without disclosing value; only
  lifecycle events stay public.
- **UX for pending/unconfirmed intents** — visible in-flight states (proving, balancing, submitted),
  retry and failure recovery around the conservative TTL handling, so users never double-submit.
- **Lifecycle extension** — richer state machine (`DEPOSITING → COMMITTED → LOCKED → RELEASABLE →
  SETTLED`) and per-vault configuration (grace periods, penalty curves), each transition a distinct
  Compact circuit.

### Wave 3 — escrow, inheritance custody, audit

- **Group escrow** — the time-lock vault becomes multi-party escrow: N-of-M approvers with per-party
  commitments, deadline-arbitrated release, and dispute refunds, all enforced in Compact circuits, not
  by the app.
- **Multi-signature time-lock custody** — multiple keyholders required to remove/revoke funds, combined
  with beneficiary recipient revocation for inheritance-style vaults.
- **Testing discipline** — contract-level testkit-js suites for every circuit (happy path, boundary
  timestamps, penalty math, failed assertions, replay/nonce reuse) executed against preview before any
  patch ships, plus property tests for lifecycle invariants.
- **Audit & mainnet** — formal review of the Compact contracts and witness handling, then the audited
  contract deployed to mainnet.

---

## Reference repos

- **Create Midnight App** — scaffolding and deployment structure
- **Midnight Escrow** — asset-locking / state-machine architecture (`EMPTY → LOCKED → READY → WITHDRAWN → PENALTY_EXECUTED`)
- **Example ZK Loan** — private financial state and ZK validation patterns
- **Midnight Local Dev** — local network/testing environment
- **Midnight Wallet SDK** — wallet and transaction functionality
- **OpenZeppelin Compact Contracts** — reusable Compact primitives
- **Compact Tools** — compile and build tooling
- **Midnight Doctor** — environment/version validation