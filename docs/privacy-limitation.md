# Privacy model — Wave 2 Commitment Scheme Hardening

## Hardened (Wave 2)
The previous limitation (`disclose(amt)`) has been **hardened**:
`contracts/time-locked-vault/time_locked_vault.compact` does **not** disclose `amt` to the public ledger.
Instead, amount is private witness data verified exclusively through:
`vaultTermsCommitment = persistentCommit([amt, unlockTime, lockType, penaltyBps], nonce)`

Observer with indexer sees:
- `vaultOwner` (32B persistent hash commitment)
- `vaultUnlockTime`
- `vaultLockType`
- `vaultPenaltyBps`
- `vaultState`
- `vaultTermsCommitment` (ZK commitment containing the amount)
- `vaultReleaseHash` (hash of release secret, or zero-hash if none)

Amount is **strictly hidden** on-chain. Only the vault creator/owner with the private witness state (`secretKey`, `nonce`, `amount`) can recompute the commitment and satisfy the ZK circuits.

## What is private in Wave 2
- `vaultAmount` (never disclosed on-chain; private witness)
- `secretKey` (`ownerSecret` witness)
- `nonce` preimage (private witness)
- `releaseSecret` preimage (private witness)
- `ownerProof` delegation material
- Browser-local pairing in encrypted localStorage
