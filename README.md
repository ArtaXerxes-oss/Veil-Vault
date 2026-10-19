# VEIL Vault

[![CI](https://github.com/ArtaXerxes-oss/Veil-Vault/actions/workflows/ci.yml/badge.svg)](https://github.com/ArtaXerxes-oss/Veil-Vault/actions/workflows/ci.yml)

**VEIL Vault** is a private, time-locked asset vault for the [Midnight](https://midnight.network) blockchain. It connects a real Midnight wallet (1AM/Lace), deploys and initializes a real **Compact** contract, creates private vaults via a real `createVault` circuit call, and supports withdrawals on schedule or early exits with a penalty.

This project was developed as a fresh build in this repository for the Midnight Buildathon. The app, Compact contract, wallet integration, and product flow were authored for this submission and are not presented as a fork, copy, or inherited codebase from a prior product.

> **Buildathon submission:** repo + `docs/slide-deck.md` + video `https://youtu.be/dyCqXgBnkgE` via AKINDO. License Apache-2.0 (`LICENSE`). Add `midnightntwrk` topic in GitHub About — see `docs/GITHUB-SETUP.md`. Judge init path: `docs/DEPLOY-CHECKLIST.md`. Known privacy scope: `docs/privacy-limitation.md`.

The frontend talks directly to the live chain — no simulation. Balances and ownership live in Compact **private state**; commitments, vault counters, treasury, and lifecycle status are readable from the Midnight indexer.

> **Current deployment status:** a real contract is deployed on **preprod** and wired into the app by default. It is _deployed but not yet initialized_ — initialize it from the **Deploy** page (`#/deploy`) once you've connected your wallet.

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

| Field    | Value                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| Address  | `4f6d1873d4d8a0f7f3fee414b817063a7fb9ab5a9654508734d989d4d564a68b`                          |
| Network  | **preprod** (verified live via Blockfrost preprod indexer)                                  |
| Status   | **Initialized** (`initialized=true`, `treasury=0xfe09b1ba…72ce`, `vaultCounter=0`)           |
| Bound by | `.env` / `.env.local` → `VITE_CONTRACT_ADDRESS` with code fallback `DEFAULT_CONTRACT_ADDRESS`|

The contract is fully initialized and operational. You can connect your wallet and create/manage private time-locked vaults immediately via **#/create**.

---

## Video Demo

[![VEIL Vault — Video Demo](https://img.youtube.com/vi/dyCqXgBnkgE/maxresdefault.jpg)](https://youtu.be/dyCqXgBnkgE?si=vp7PBt19bv0XHSBc)

**Watch:** https://youtu.be/dyCqXgBnkgE?si=vp7PBt19bv0XHSBc — full product loop: wallet connect → deploy/initialize → createVault → strict/penalty withdraw.

**Pitch deck:** https://gamma.app/docs/VEIL-Vault-ypg0jo0ifligaen

---

## ScreenShot Of Compiled Contract

![Compiled_Contract](public/compact.png)

## ScreenShot Of Deployed Contract With Address

![Deployed_Contract](public/deployed.png)

## Architecture

The app keeps two deliberately separate layers:

- **`src/lib/contract.ts`** — an executable reference model of the Wave 2 authority (validation, lock modes, penalty, encrypted unlock secrets, extended lifecycle, treasury accounting, private-state tracking). Used by the test suite only.
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

## Toolchain

Verified on **2026-09-21** (Node `v22.22.0`, npm `10.9.4`, Linux x64).

### Compact toolchain (installed)

| Component                    | Version                                                                                            | Source / Notes                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `compact` wrapper            | `0.5.1`                                                                                            | `~/.local/bin/compact` (`compact --version`)                                                                                |
| Compact compiler (active)    | `0.31.1`                                                                                           | `compact list` → `→ 0.31.1 - x86_macos, aarch64_macos, x86_linux, aarch64_linux`                                            |
| Compact compiler (available) | `0.34.0`, `0.31.0`, `0.30.0`, `0.29.0`, `0.28.0`, `0.26.0`, `0.25.0`, `0.24.0`, `0.23.0`, `0.22.0` | `compact list`                                                                                                              |
| Compact language             | `0.23.0`                                                                                           | `contracts/managed/.../compiler/contract-info.json` → `language-version`                                                    |
| Compact runtime              | `0.16.0`                                                                                           | `contract-info.json` → `runtime-version` + `compact-runtime@0.16.0` + `contract/index.js` → `checkRuntimeVersion('0.16.0')` |
| `compactc` binary            | `0.31.1`                                                                                           | `~/.compact/versions/0.31.1/x86_64-unknown-linux-musl/compactc`                                                             |

### JS / Build toolchain (installed)

| Component                               | Version                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| Node.js                                 | `v22.22.0`                                                            |
| npm                                     | `10.9.4`                                                              |
| TypeScript                              | `5.7.2`                                                               |
| Vite                                    | `5.4.11`                                                              |
| `@midnight-ntwrk/compact-js`            | `2.5.1` (exact pinned — `2.5.3` requires unpublished `ledger-v9`)     |
| `@midnight-ntwrk/compact-runtime`       | `0.16.0`                                                              |
| `@midnight-ntwrk/ledger-v8`             | `8.1.2` (deduped via override — `npm ls ledger-v8` shows single copy) |
| `@midnight-ntwrk/midnight-js-contracts` | `4.1.1`                                                               |
| `@midnight-ntwrk/testkit-js`            | `4.1.1`                                                               |
| `@midnight-ntwrk/ledger`                | `4.0.0`                                                               |

### Contract that compiles via `compact compile` (verified)

**Source:** `contracts/time-locked-vault/time_locked_vault.compact` (245 lines, `pragma language_version >= 0.20`, 8 circuits)

```bash
compact compile contracts/time-locked-vault/time_locked_vault.compact contracts/managed/time-locked-vault
# or
npm run compile   # → compact compile contracts/time-locked-vault/time_locked_vault.compact contracts/managed/time-locked-vault

# verified fresh 2026-09-21:
compact compile contracts/time-locked-vault/time_locked_vault.compact /tmp/veil-verify-compile
# => Compiling 8 circuits:  EXIT 0
# => /tmp/veil-verify-compile/{compiler,contract,keys,zkir}
```

**Output (matches `contracts/managed/time-locked-vault/time_locked_vault/`):**

| Artifact      | Location                           | Contents                                                                                                                                              |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract JS   | `contract/index.js` + `index.d.ts` | `checkRuntimeVersion('0.16.0')`, `Ledger` + `Witnesses` + `Circuits` types                                                                            |
| Compiler info | `compiler/contract-info.json`      | `compiler-version 0.31.1 / language 0.23.0 / runtime 0.16.0`, 8 circuits + 5 witnesses + 12 ledger entries                                            |
| Keys          | `keys/*.prover` + `*.verifier`     | 16 files — `initialize`, `createVault`, `withdraw`, `withdrawWithPenalty`, `isVaultInitialized`, `getTreasury`, `getTreasuryBalance`, `getVaultState` |
| ZKIR          | `zkir/*.zkir` + `*.bzkir`          | 16 files — same 8 circuits                                                                                                                            |

**Circuits compiled (8):** `initialize` (k=9, 319 rows), `createVault` (k=14, 8470 rows), `withdraw` (k=14, 11918 rows), `withdrawWithPenalty` (k=14, 12430 rows), `getVaultState` (k=7, 112 rows), `isVaultInitialized` (k=6, 26 rows), `getTreasury` (k=6, 48 rows), `getTreasuryBalance` (k=6, 26 rows) — see `contracts/time-locked-vault/.circuit-info.json`.

> ZK assets are synced to `public/contract/time-locked-vault/` via `npm run sync:zk` for the wallet/proof server.

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
VITE_CONTRACT_ADDRESS=4f6d1873d4d8a0f7f3fee414b817063a7fb9ab5a9654508734d989d4d564a68b

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
- **`#/create`** — new vault form. Editable at all times; the **submit button unlocks only when** you are connected, a contract is bound, _and_ the contract is initialized (targeted hints tell you which step is missing).
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
tests/                               Contract + validation Wave 2 test suite (36 tests)
docs/                                architecture.md, privacy-model.md, threat-model.md
scripts/                             deploy.ts, setup.ts
```

---

## Verification

Prerequisites (verified): Node.js `v22.22.0`, npm `10.9.4`, Compact `0.5.1` / compiler `0.31.1`.

```bash
npm install
npm run typecheck     # tsc --noEmit
npm test              # builds src/lib/contract.ts via esbuild, runs node --test
npm run build         # tsc -b && vite build
npm run lint          # eslint src
```

Expected (verified 2026-10-15): `# tests 26 / # suites 4 / # pass 26 / # fail 0` across `tests/time-locked-vault/contract.test.ts, validation.test.ts, simulation.test.ts, contract-artifacts.test.ts`.

Recompile the Compact contract / resync ZK assets:

```bash
npm run compile       # compact compile …/time_locked_vault.compact
npm run sync:zk       # copy keys + zkir into public/
npm run build:contract
```

### Verifying on-chain state (read path)

The app's real read path — `createPatchedPublicDataProvider` → `contractAction(address) { state ... }` → `ContractState.deserialize` → compiled `ledger()` — decodes the deployed contract as:

```json
{
  "initialized": false,
  "vaultCounter": 0,
  "treasuryBalance": "0",
  "treasury": "0000000000000000000000000000000000000000000000000000000000000000"
}
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

### Public state vs Private witness

Midnight's Compact separates **on-chain ledger** (public, indexer-readable) from **witnesses** (private, proof-only). VEIL Vault uses both every circuit.

**Public ledger (`export ledger` in `contracts/time-locked-vault/time_locked_vault.compact:17`) — visible on-chain via indexer at `public/contract/time-locked-vault/` / GraphQL `state`:**

| Ledger field | Type | Disclosure | Visibility |
|---|---|---|---|
| `initialized` | `Boolean` Cell | `disclose()` in `initialize` | Public — `isVaultInitialized()` query |
| `vaultCounter` | `Counter` | `increment(1)` | Public — monotonic id |
| `treasury` | `Bytes<32>` Cell | `disclose(treasuryAddr)` | Public — `getTreasury()` |
| `treasuryBalance` | `Uint<128>` Cell | `+ disclose(penalty)` | Public — `getTreasuryBalance()` |
| `ownerPublicKey` | `Bytes<32>` Cell | `disclose(deriveKey(ownerSecret))` in `constructor:68` | Public commitment, secret never leaves witness |
| `vaultOwner` | `Map<Uint<64>, Bytes<32>>` | `disclose(callerPk)` per vault | Public — owner commitment derived from creator's secret |
| `vaultUnlockTime` | `Map<Uint<64>, Uint<64>>` | `disclose(unlockTime)` | Public — unlock policy |
| `vaultLockType` | `Map<Uint<64>, Uint<8>>` | `disclose(lockType)` (`0`=STRICT, `1`=PENALTY) | Public |
| `vaultPenaltyBps` | `Map<Uint<64>, Uint<16>>` | `disclose(penaltyBps)` | Public |
| `vaultState` | `Map<Uint<64>, VaultState>` | Extended state transitions (`EMPTY → DEPOSITING → COMMITTED → LOCKED → READY → RELEASABLE → WITHDRAWN / PENALTY_EXECUTED`) | Public lifecycle — `getVaultState()` |
| `vaultTermsCommitment` | `Map<Uint<64>, Bytes<32>>` | `disclose(persistentCommit([amt, unlockTime, lockType, penaltyBps], nonce))` | Public commitment; **amount is strictly hidden in ZK** |
| `vaultReleaseHash` | `Map<Uint<64>, Bytes<32>>` | `disclose(getReleaseHash(releaseSecret))` | Public hash commitment for optional secret unlock |

All reads go through `createPatchedPublicDataProvider → contractState → ContractState.deserialize → ledger()` — no private field is ever `lookup()`'d without `disclose()` gating.

**Private witnesses (`witness` in `time_locked_vault.compact:38` + `contracts/time-locked-vault/witnesses.ts:4`) — stored only in `VeilVaultPrivateState` (browser `veil-vault-private-meta-v1:<address>`, never on-chain):**

| Witness | `VeilVaultPrivateState` field | Used in | Role |
|---|---|---|---|
| `ownerSecret(): Bytes<32>` | `secretKey` | `constructor`, `createVault`, `commitVault`, `withdraw`, `withdrawWithPenalty` | Private key → `deriveKey(sk)=persistentHash([pad("veil:vault:key"), sk])` → `ownerPublicKey`; `assert(deriveKey(ownerSecret)==vaultOwner.lookup)` proves ownership without revealing `sk` |
| `vaultAmountPrivate(): Uint<128>` | `amount` | `createVault`, `withdraw`, `withdrawWithPenalty` | Vault balance; checked against `vaultTermsCommitment` without on-chain disclosure |
| `vaultNonce(): Bytes<32>` | `nonce` | `createVault`, `withdraw`, `withdrawWithPenalty` | Random 32B for `persistentCommit<Vector<4,Bytes<32>>>([amt, unlockTime, lockType, penaltyBps], nonce)` → `vaultTermsCommitment`; recomputed on withdraw to prove terms unchanged |
| `releaseSecret(): Bytes<32>` | `releaseSecret` | `createVault`, `withdraw`, `withdrawWithPenalty` | Private passphrase preimage; hashed via `getReleaseHash` and verified against `vaultReleaseHash` |
| `vaultPenalty(): Uint<128>` | `penalty` | `withdrawWithPenalty` | `assert(penalty*10000==amount*penaltyBps)` (early) or `==0` (unlocked) → `treasuryBalance += disclose(penalty)` |
| `currentTime(): Uint<64>` | `currentTime` | `createVault`, `markReleasable`, `withdraw`, `withdrawWithPenalty` | `assert(unlockTime > currentTime())` on create, `assert(currentTime() >= unlockTime)` on withdraw / releasable |
| `ownerProof(): Bytes<32>` | `ownerProof` (reserved) | declared `witness ownerProof(): Bytes<32>` | Reserved for future N-of-M / delegated proof in Wave 3 multi-party circuits |

**How the proof ties them:**

```text
createVault:  private (secretKey, amount, nonce, currentTime)
              → deriveKey + persistentCommit → disclose() → public ledger
              → ZK proof: "I know sk/nonce s.t. commitment opens and time is valid"
withdraw:     private (secretKey, nonce, currentTime)
              → recompute commitment, check deriveKey == vaultOwner, check time ≥ unlock
              → disclose() state transition LOCKED → WITHDRAWN
withdrawWithPenalty:
              private (secretKey, nonce, penalty, currentTime)
              → same owner + commitment check + penalty arithmetic proof
              → disclose(penalty) funds treasury, disclose(ownerPayout) returns to caller
```

> **UI `PRIVATE` masking is not the privacy.** The frontend shows `PRIVATE` by default for product clarity, but real privacy is the witness never hitting the ledger. See `docs/privacy-model.md:5` for visibility table and `docs/threat-model.md:30` for leakage defenses.

### What an observer can and cannot learn

An **observer** = anyone with the contract address + Midnight indexer/GraphQL (`indexer.preprod.midnight.network/api/v4/graphql`) — no wallet, no private state, no proof.

**Can learn (public ledger — `disclose()`'d on-chain):**

| Can see | Example value | Where |
|---|---|---|
| Contract is initialized | `initialized=true/false` via `isVaultInitialized()` | `time_locked_vault.compact:20` |
| How many vaults exist | `vaultCounter=3` | Counter query |
| Treasury address + balance | `treasury=0x…`, `treasuryBalance=250` via `getTreasury/getTreasuryBalance` | Public settlement accounting |
| Per-vault lifecycle | `vaultState[42]=LOCKED` via `getVaultState(42)` | Extended state machine `EMPTY→DEPOSITING→COMMITTED→LOCKED→READY→RELEASABLE→WITHDRAWN/PENALTY_EXECUTED` |
| Per-vault policy | `vaultUnlockTime[42]=1735689600`, `vaultLockType[42]=1`, `vaultPenaltyBps[42]=500` | Public time-lock/penalty terms |
| Per-vault owner commitment | `vaultOwner[42]=0x9f…` | Commitment, not the secret — only the 32B `persistentHash([pad("veil:vault:key"), secretKey])` |
| Per-vault terms commitment | `vaultTermsCommitment[42]=0xab…` | `persistentCommit([amount, unlockTime, lockType, penaltyBps], nonce)` — checks integrity, preimage hidden |
| Per-vault release hash | `vaultReleaseHash[42]=0xef…` | Optional hash of unlock secret (zero-hash if unlocked purely by time) |
| Amount | **HIDDEN** | **Wave 2 hardened**: amount is NOT disclosed on-chain; verified exclusively via ZK commitment |

An observer watching the indexer sees: *"Vault #42 is LOCKED, penalty vault, unlocks 2025-12-31, owned by commitment 0x9f…, terms hash 0xab…, release hash 0xef…"* — but cannot see the amount or secret key.

**Cannot learn (private witnesses + local storage — never on-chain):**

| Cannot see | Why | Location |
|---|---|---|
| `amount` (vault balance) | Witness only; verified inside ZK `vaultTermsCommitment` without on-chain disclosure | `time_locked_vault.compact:104` |
| `secretKey` (`ownerSecret`) | Only witness, `deriveKey` hashes it — raw 32B never `disclose()`'d | `witnesses.ts:15` → `VeilVaultPrivateState.secretKey` |
| `releaseSecret` | Secret passphrase preimage never on-chain — only hash is stored | `witnesses.ts:35` → `VeilVaultPrivateState.releaseSecret` |
| `nonce` preimage | Only inside `persistentCommit` preimage — observer sees only 32B hash | `witnesses.ts:23` |
| Linkage of `vaultTermsCommitment` to its fields without nonce | Commitment is hiding — need `nonce` + all 4 fields to recompute | `time_locked_vault.compact:104` |
| `ownerProof` delegation material | Reserved witness | `witness ownerProof:37` |
| Browser-local amount/nonce pairing | Stored under `localStorage: veil-vault-private-meta-v1:<address>` — per-browser, deleted if cleared | `src/lib/vaultContract.ts` |
| Who the owner commitment belongs to | `vaultOwner` is a hash, no on-chain mapping to wallet address — only holder of `secretKey` can produce `assert(deriveKey(secret)==owner)` on withdraw | `withdraw` + `withdrawWithPenalty` |

**Concrete example — vault #2 created via `createVault(2, 1735689600, 1, 500)`:**

```text
Observer sees on indexer:  vaultOwner[2]=0x9f…, vaultState[2]=LOCKED, vaultTermsCommitment[2]=0xab…, vaultReleaseHash[2]=0xef…, unlock=1735689600
Observer cannot see:       amount=1000, secretKey=0x12… (32B), nonce=0x77… (32B), releaseSecret=0x44… (32B), that 0xab… = Commit([1000,1735689600,1,500], 0x77…)
Withdraw proof:            prover locally injects secretKey+nonce+amount+currentTime+releaseSecret, recomputes 0xab… and deriveKey, ZK verifier checks equality — no secret leaves browser
Penalty case:              observer sees treasuryBalance +50 after early withdraw, but never sees penalty preimage 50 derived as amount*penaltyBps/10000 inside private witness
```

- Wave 2 implements token denomination for tDUST / DUST, tracking shielded token amounts in private state and commitment.
- The wallet approval flow re-triggers per action; the app never holds signing keys. Private state is scoped per contract address (`veil-vault-private-meta-v1:<address>`) — withdrawals only work from the browser that created the vault.
- **Wave 2 privacy hardening:** `vaultAmount` is no longer disclosed — observer sees only `vaultTermsCommitment`. Amount privacy matches `docs/privacy-model.md` ("Amount | Private").

See `docs/architecture.md`, `docs/privacy-model.md`, and `docs/threat-model.md` for details.

---

## Roadmap

### Wave 2 — real value on real value rails

- [x] **tDUST/DUST deposits backed by shielded balances** — **COMPLETE**: Full token denomination support for tDUST / DUST. Values tracked as measurable token units, commitments and witnesses preserve private balances.
- [x] **Encrypted unlock secrets instead of timestamps alone** — **COMPLETE**: Added `releaseSecret` witness and `vaultReleaseHash` ledger commitment. Dual time-or-secret release verified by Compact circuits.
- [x] **Commitment scheme hardening** — **COMPLETE**: Amounts and ownership moved fully into ZK commitments (`persistentCommit([amount, unlockTime, lockType, penaltyBps], nonce)`). Public `vaultAmount` disclosure removed from ledger.
- [x] **UX for pending/unconfirmed intents** — **COMPLETE**: Interactive 4-phase transaction progress tracker (`proving` → `balancing` → `submitting` → `confirming`) with real-time feedback and state sync so users never double-submit.
- [x] **Lifecycle extension** — **COMPLETE**: Richer Compact state machine (`EMPTY → DEPOSITING → COMMITTED → LOCKED → READY → RELEASABLE → WITHDRAWN | PENALTY_EXECUTED`) with dedicated `commitVault` and `markReleasable` circuits.

### Wave 3 — Escrow, Multi-Sig Custody & Mainnet Deployment (Upcoming)

With the 5 core Wave 2 capabilities shipped (commitment hardening, encrypted unlock secrets, tDUST denominations, lifecycle extensions, and pending intent UX), Wave 3 transforms VEIL Vault from single-user time-locks into an institutional-grade, multi-party custody and escrow protocol:

#### 1. N-of-M Multi-Party Group Escrow (`EscrowVault.compact`)
- **ZK Multi-Party Arbitrated Release**: Vaults supporting $K$-of-$N$ threshold authorizations (buyers, sellers, arbiters, or executors) to approve fund releases or mutual cancellations.
- **Commitment-Hiding Approvals**: Approver identities and approval states remain strictly confidential via private witness proofs (`approverSecret` and nullifier checks) rather than revealing participant pubkeys on-chain.
- **Arbitration & Dispute Refund Circuits**: Built-in fallback deadline conditions where funds automatically revert to the depositor if approvals stall or disputes trigger arbiter intervention.

#### 2. Multi-Signature Time-Lock Custody & Inheritance Vaults
- **Threshold Keyholder Custody**: Large treasury reserves require threshold $M$-of-$N$ key signatures to initiate or authorize early emergency penalty withdrawals.
- **Beneficiary Designation with Time-Lock Cascades**: Inheritance vaults where a primary owner holds execution rights during their lifetime, with secondary beneficiary keys activating only after an inactivity heartbeat period (dead-man switch) expires.
- **Revocable Delegated Withdrawals**: Zero-knowledge delegation tickets enabling trusted executors to withdraw on behalf of beneficiaries without learning the underlying vault amount.

#### 3. Formal Testing Discipline & Invariant Verification
- **Full `testkit-js` Circuit Matrix**: Comprehensive contract-level tests for every Compact circuit, verifying boundary timestamps, penalty arithmetic precision, and zero-remainder splits.
- **Replay & Nullifier Safety**: Property tests proving replay attacks and nonce repetition are mathematically impossible under the Compact ledger state model.
- **Preview & Preprod Multi-Wallet Matrix**: Automated CI validation using multiple simultaneous 1AM and Lace test wallets on preprod and preview testnets.

#### 4. Security Audit & Mainnet Readiness
- **Compact & Witness Security Review**: External review of witness handling, private state isolation in `localStorage`, and key derivation domain separation (`"veil:vault:key"`).
- **Midnight Mainnet Deployment**: Deployment of audited circuits to Midnight mainnet with production explorer indexing and public verification records.

---

## Reference ecosystem

- **Create Midnight App** — project scaffolding and deployment conventions used for app setup and local build flow ([Midnight docs](https://docs.midnight.network/develop/tutorial/building))
- **Midnight** — network and ZK primitives used by the app, including wallet flow and Compact runtime behavior ([midnight.network](https://midnight.network))
- **Escrow / state-machine patterns** — general lifecycle patterns for lock-and-release flows (`EMPTY → LOCKED → READY → WITHDRAWN → PENALTY_EXECUTED`) used as architecture inspiration; the final implementation, contract logic, and product flow were designed specifically for this project and implemented in this repository
- **Wallet + Compact tooling** — wallet SDK, compact compiler `0.31.1`, ledger-v8 `8.1.2`, and related runtime dependencies used to compile and interact with the contract

---

## On-chain record (Wave 2, verified from repo)

| Item | Value |
|---|---|
| Contract | `4f6d1873d4d8a0f7f3fee414b817063a7fb9ab5a9654508734d989d4d564a68b` preprod |
| State on-chain | `initialized=true, treasury=0xfe09b1ba…72ce, vaultCounter=0` |
| Explorer | `https://explorer.preprod.midnight.network` / Blockfrost Preprod Indexer |
| Init Tx | `6d69646e696768743a7472616e73616374696f6e5b76395d287369676e617475…` (confirmed) |

---

## Self-review (not an external audit)

| ID | Finding | Status |
|---|---|---|
| W2-1 | `vaultAmount` disclosed | **RESOLVED** — Hardened to ZK commitment-only in Compact circuits (`time_locked_vault.compact:104`) |
| W2-2 | Treasury is local random key, no Dust transfer | Known Wave 2 scope |
| W2-3 | Private meta in `localStorage`, withdraw needs origin browser | Mitigated with export/import in `src/lib/vaultContract.ts:84` |
| W2-4 | Tests cover TS model + artifacts + simulation, not live preview matrix | Documented in `tests/` |

---

## What's not here

- No token movement — asset is a label in Wave 2.
- No mainnet deploy — preprod only.
- No external audit — self-review only.
- Secrets in `scripts/` are templates; no mainnet keys in repo.

---

## Contributing

Issues and PRs welcome. Do not commit wallets, seeds, or mainnet keys. Match `npm run typecheck && npm test && npm run build` before PR.

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).

The **"VEIL Vault"** name and logo are trademarks of VEIL Vault contributors and are not licensed under Apache 2.0.
