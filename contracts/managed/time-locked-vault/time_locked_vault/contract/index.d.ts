import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  ownerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  vaultAmountPrivate(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  vaultNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  vaultPenalty(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  currentTime(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             treasuryAddr_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createVault(context: __compactRuntime.CircuitContext<PS>,
              vaultId_0: bigint,
              amount_0: bigint,
              unlockTime_0: bigint,
              lockType_0: bigint,
              penaltyBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, vaultId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdrawWithPenalty(context: __compactRuntime.CircuitContext<PS>,
                      vaultId_0: bigint,
                      penaltyBps_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  getVaultState(context: __compactRuntime.CircuitContext<PS>, vaultId_0: bigint): __compactRuntime.CircuitResults<PS, number>;
  isVaultInitialized(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
  getTreasury(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  getTreasuryBalance(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             treasuryAddr_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createVault(context: __compactRuntime.CircuitContext<PS>,
              vaultId_0: bigint,
              amount_0: bigint,
              unlockTime_0: bigint,
              lockType_0: bigint,
              penaltyBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, vaultId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdrawWithPenalty(context: __compactRuntime.CircuitContext<PS>,
                      vaultId_0: bigint,
                      penaltyBps_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  getVaultState(context: __compactRuntime.CircuitContext<PS>, vaultId_0: bigint): __compactRuntime.CircuitResults<PS, number>;
  isVaultInitialized(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
  getTreasury(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  getTreasuryBalance(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             treasuryAddr_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createVault(context: __compactRuntime.CircuitContext<PS>,
              vaultId_0: bigint,
              amount_0: bigint,
              unlockTime_0: bigint,
              lockType_0: bigint,
              penaltyBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, vaultId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdrawWithPenalty(context: __compactRuntime.CircuitContext<PS>,
                      vaultId_0: bigint,
                      penaltyBps_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  getVaultState(context: __compactRuntime.CircuitContext<PS>, vaultId_0: bigint): __compactRuntime.CircuitResults<PS, number>;
  isVaultInitialized(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
  getTreasury(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  getTreasuryBalance(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
}

export type Ledger = {
  readonly initialized: boolean;
  readonly vaultCounter: bigint;
  readonly treasuryBalance: bigint;
  readonly treasury: Uint8Array;
  readonly ownerPublicKey: Uint8Array;
  vaultOwner: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  vaultAmount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  vaultUnlockTime: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  vaultLockType: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  vaultPenaltyBps: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  vaultState: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): number;
    [Symbol.iterator](): Iterator<[bigint, number]>
  };
  vaultTermsCommitment: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
