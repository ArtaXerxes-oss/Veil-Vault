# Privacy limitation — Wave 2 disclosure

## Current (Wave 2 entry)
`contracts/time-locked-vault/time_locked_vault.compact:120` does `disclose(amt)` into `vaultAmount`.
Observer with indexer sees amount, unlock time, lock type, lifecycle. Owner secret + nonce stay in witnesses (`contracts/time-locked-vault/witnesses.ts:4`).

This is intentional for Wave 2 judging so `withdraw` / `withdrawWithPenalty` can be verified against public `vaultAmount` without a separate reveal step.

## Wave 2 hardening (next)
Move amount to commitment-only: keep `vaultTermsCommitment = persistentCommit([amt, unlockTime, lockType, penaltyBps], nonce)` as sole public value, remove `vaultAmount` disclose. Requires contract change + recompile + redeploy + new AKINDO version (later Wave, not this Wave 2 freeze).

## What is still private in Wave 2
`secretKey`, `nonce` preimage, `ownerProof` material, browser-local pairing. `vaultOwner` is `persistentHash` commitment only.
