export type LockType = "STRICT" | "PENALTY";
export type VaultState = "EMPTY" | "LOCKED" | "READY" | "WITHDRAWN" | "PENALTY_EXECUTED";
export type VaultStatus = "ACTIVE" | "WITHDRAWN";
export type TransactionKind = "CREATE" | "WITHDRAW" | "PENALTY_WITHDRAW";
export type TransactionStatus = "CONFIRMED" | "FAILED";

export interface Vault {
  id: number;
  owner: string;
  asset: string;
  amount: bigint;
  unlockTime: number;
  lockType: LockType;
  penaltyBps: number;
  status: VaultStatus;
  vaultState: VaultState;
  createdAt: number;
  withdrawnAt?: number;
  penaltyPaid?: bigint;
  ownerPayout?: bigint;
}

export interface PublicVault {
  id: number;
  asset: string;
  unlockTime: number;
  lockType: LockType;
  status: VaultStatus;
  vaultState: VaultState;
}

export interface TransactionRecord {
  id: string;
  kind: TransactionKind;
  vaultId: number;
  timestamp: number;
  status: TransactionStatus;
  message: string;
  penaltyPaid?: bigint;
  ownerPayout?: bigint;
}

export interface SerializedVault extends Omit<Vault, "amount" | "penaltyPaid" | "ownerPayout"> {
  amount: string;
  penaltyPaid?: string;
  ownerPayout?: string;
}

export interface SerializedTransaction extends Omit<TransactionRecord, "penaltyPaid" | "ownerPayout"> {
  penaltyPaid?: string;
  ownerPayout?: string;
}

export interface SerializedContractState {
  initialized: boolean;
  treasury: string;
  treasuryBalance: string;
  vaultCounter: number;
  userSecret: string;
  ownerPublicKey: string;
  vaults: SerializedVault[];
  transactions: SerializedTransaction[];
}