import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger } from "../managed/time-locked-vault/time_locked_vault/contract/index.js";

export type VeilVaultPrivateState = {
  secretKey: Uint8Array;
  amount: bigint;
  ownerProof: Uint8Array;
  nonce: Uint8Array;
  penalty: bigint;
  currentTime: bigint;
};

export const witnesses = {
  ownerSecret(context: WitnessContext<Ledger, VeilVaultPrivateState>): [VeilVaultPrivateState, Uint8Array] {
    return [context.privateState, context.privateState.secretKey];
  },

  vaultAmountPrivate(context: WitnessContext<Ledger, VeilVaultPrivateState>): [VeilVaultPrivateState, bigint] {
    return [context.privateState, context.privateState.amount];
  },

  vaultNonce(context: WitnessContext<Ledger, VeilVaultPrivateState>): [VeilVaultPrivateState, Uint8Array] {
    return [context.privateState, context.privateState.nonce];
  },

  vaultPenalty(context: WitnessContext<Ledger, VeilVaultPrivateState>): [VeilVaultPrivateState, bigint] {
    return [context.privateState, context.privateState.penalty];
  },

  currentTime(context: WitnessContext<Ledger, VeilVaultPrivateState>): [VeilVaultPrivateState, bigint] {
    return [context.privateState, context.privateState.currentTime];
  }
};
