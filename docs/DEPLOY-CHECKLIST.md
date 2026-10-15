# Deploy checklist — Wave 2 (preprod)

Default contract: `ca572dfc83d9eef244fdecc3becb0cc03ed56f6590f28cceaabee5c9688ba3ed`

## Judge path (2 min)
1. Install 1AM (recommended) or Lace, set network `preprod`.
2. Open app → Connect wallet.
3. On `#/deploy`:
   - Either click **Deploy contract** to deploy a fresh contract instance with your wallet as deployer and initialize it, OR
   - Connect to an existing initialized contract address.
4. `#/create` unlocks when connected + bound + initialized.
5. Create vault → `createVault` prove → balance → submit. Each vault is securely bound to the creator's private key.
6. Try early strict withdraw → expect reject. Withdraw after unlock or penalty-exit.

## Contract Security & Access Control
- `initialize(treasury)` enforces that only the deployer's secret can initialize the treasury (`assert(deriveKey(ownerSecret()) == ownerPublicKey)`).
- `createVault` records the caller's derived key (`callerPk`), ensuring multi-user isolation so each user can independently withdraw their own vaults.

## Troubleshooting
- `Invalid Transaction: Custom error: 182` = TTL expired / double-submit. Wait for tip sync, retry once.
- Indexer `https://indexer.preprod.midnight.network/api/v4/graphql`.
- Private meta is per-browser (`veil-vault-private-meta-v1:<address>`). Export before switching browsers — see vault backup in `#/history`.
