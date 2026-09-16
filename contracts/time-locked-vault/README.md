# Time-locked vault contract boundary

This directory isolates the Wave 1 Midnight contract from the frontend. The executable behavior used by the local demo and tests is `src/lib/contract.ts`; it exists so the financial invariants can be verified without pretending that a browser-local simulator is a deployed ledger.

`time_locked_vault.compact` describes the required ledger fields and circuits:

- one-time initialization;
- unique vault IDs;
- positive amounts and future unlock times;
- strict and penalty withdrawal modes;
- basis-point penalty calculation;
- owner authorization;
- treasury accounting;
- single-settlement lifecycle.

The exact Compact type names and wallet proof bindings should be checked against the Midnight Compact SDK version used for deployment. No deployed contract address is bundled in this Wave 1 package.