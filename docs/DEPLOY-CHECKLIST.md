# Deploy checklist — Wave 2 (preprod)

Default contract: `ca572dfc83d9eef244fdecc3becb0cc03ed56f6590f28cceaabee5c9688ba3ed`

## Judge path (2 min)
1. Install 1AM (recommended) or Lace, set network `preprod`.
2. Open app → Connect wallet (`#/deploy` shows current address + `initialized` flag).
3. If `Status: deployed / not initialized`:
   - Keep default treasury hex (random Wave 2 local key) or paste 64-hex.
   - Click Initialize contract → approve in wallet → wait for indexer (`initialized=true`).
4. `#/create` unlocks only when connected + bound + initialized.
5. Create vault → `createVault` prove → balance → submit.
6. Try early strict withdraw → expect reject. Withdraw after unlock or penalty-exit.

## Why uninitialized by default
Initialize is a signed tx only the deployer wallet can produce. The repo ships bound but uninitialized so judges see real chain state, not a mock.

## Troubleshooting
- `Invalid Transaction: Custom error: 182` = TTL expired / double-submit. Wait for tip sync, retry once.
- Indexer `https://indexer.preprod.midnight.network/api/v4/graphql`.
- Private meta is per-browser (`veil-vault-private-meta-v1:<address>`). Export before switching browsers — see vault backup in `#/history`.
