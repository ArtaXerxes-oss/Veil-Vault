import type {
  LockType,
  PublicVault,
  SerializedContractState,
  TransactionRecord,
  Vault
} from "../types";

export const MAX_PENALTY_BPS = 10_000;
export const BASIS_POINTS = 10_000n;
export const VAIL_DOMAIN_SEPARATOR = "veil:vault:key";

export type ContractErrorCode =
  | "NOT_INITIALIZED"
  | "ALREADY_INITIALIZED"
  | "INVALID_TREASURY"
  | "INVALID_AMOUNT"
  | "INVALID_UNLOCK"
  | "INVALID_LOCK_TYPE"
  | "INVALID_PENALTY"
  | "VAULT_NOT_FOUND"
  | "UNAUTHORIZED"
  | "ALREADY_WITHDRAWN"
  | "STILL_LOCKED"
  | "INVALID_TERMS";

export class ContractError extends Error {
  constructor(
    public readonly code: ContractErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ContractError";
  }
}

export type VaultState = "EMPTY" | "LOCKED" | "READY" | "WITHDRAWN" | "PENALTY_EXECUTED";

export interface CreateVaultInput {
  owner: string;
  asset: string;
  amount: bigint;
  unlockTime: number;
  lockType: LockType;
  penaltyBps: number;
  now?: number;
}

export interface WithdrawResult {
  vault: Vault;
  penalty: bigint;
  ownerPayout: bigint;
  transaction: TransactionRecord;
}

interface PrivateVaultData {
  nonce: string;
  amount: bigint;
  termsCommitment: string;
}

export function deriveKey(secret: string): string {
  let hash = 0;
  const data = VAIL_DOMAIN_SEPARATOR + secret;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash-${Math.abs(hash).toString(16)}`;
}

function persistentCommit(value: string, nonce: string): string {
  let hash = 0;
  const data = value + nonce;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `commit-${Math.abs(hash).toString(16)}`;
}

export class TimeLockedVaultContract {
  private initialized = false;
  private treasury = "";
  private treasuryBalance = 0n;
  private vaultCounter = 0;
  private userSecret = "";
  private ownerPublicKey = "";
  private vaults = new Map<number, Vault>();
  private privateVaultData = new Map<number, PrivateVaultData>();
  private transactions: TransactionRecord[] = [];

  initialize(treasury: string, userSecret = ""): void {
    if (this.initialized) {
      throw new ContractError("ALREADY_INITIALIZED", "The vault contract is already initialized.");
    }
    if (!treasury.trim()) {
      throw new ContractError("INVALID_TREASURY", "A treasury account is required.");
    }
    this.initialized = true;
    this.treasury = treasury;
    this.treasuryBalance = 0n;
    this.vaultCounter = 0;
    this.userSecret = userSecret;
    this.ownerPublicKey = deriveKey(userSecret);
    this.vaults.clear();
    this.privateVaultData.clear();
    this.transactions = [];
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getTreasury(): { address: string; balance: bigint } {
    this.requireInitialized();
    return { address: this.treasury, balance: this.treasuryBalance };
  }

  getOwnerPublicKey(): string {
    this.requireInitialized();
    return this.ownerPublicKey;
  }

  createVault(input: CreateVaultInput): Vault {
    this.requireInitialized();
    const now = input.now ?? Date.now();
    this.validateCreateInput(input, now);

    const id = ++this.vaultCounter;
    const penaltyBps = input.lockType === "STRICT" ? 0 : input.penaltyBps;
    const vaultState: VaultState = "LOCKED";

    const nonce = `nonce-${id}-${now}`;
    const terms = persistentCommit(
      `${input.amount.toString()}|${input.unlockTime.toString()}|${input.lockType === "STRICT" ? 0 : 1}|${penaltyBps.toString()}`,
      nonce
    );

    const vault: Vault = {
      id,
      owner: input.owner,
      asset: input.asset.trim(),
      amount: input.amount,
      unlockTime: input.unlockTime,
      lockType: input.lockType,
      penaltyBps,
      status: "ACTIVE",
      vaultState,
      createdAt: now
    };

    this.vaults.set(id, vault);
    this.privateVaultData.set(id, {
      nonce,
      amount: input.amount,
      termsCommitment: terms
    });

    this.transactions.unshift({
      id: `create-${id}-${now}`,
      kind: "CREATE",
      vaultId: id,
      timestamp: now,
      status: "CONFIRMED",
      message: `Vault #${String(id).padStart(3, "0")} created.`
    });
    return this.copyVault(vault);
  }

  withdraw(vaultId: number, caller: string, callerProof: string, now = Date.now()): WithdrawResult {
    this.requireInitialized();
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new ContractError("VAULT_NOT_FOUND", "That vault does not exist.");
    }
    if (!this.verifyOwner(callerProof)) {
      throw new ContractError("UNAUTHORIZED", "Only the vault owner can withdraw.");
    }
    if (vault.status === "WITHDRAWN") {
      throw new ContractError("ALREADY_WITHDRAWN", "This vault has already been withdrawn.");
    }

    const isUnlocked = now >= vault.unlockTime;
    if (vault.lockType === "STRICT" && !isUnlocked) {
      throw new ContractError("STILL_LOCKED", "This strict vault is still locked.");
    }

    // Verify terms commitment matches
    if (!this.verifyTerms(vaultId)) {
      throw new ContractError("INVALID_TERMS", "Vault terms have been tampered with.");
    }

    const penalty = !isUnlocked && vault.lockType === "PENALTY"
      ? (vault.amount * BigInt(vault.penaltyBps)) / BASIS_POINTS
      : 0n;
    const ownerPayout = vault.amount - penalty;

    vault.status = "WITHDRAWN";
    vault.withdrawnAt = now;
    vault.penaltyPaid = penalty;
    vault.ownerPayout = ownerPayout;
    vault.vaultState = "WITHDRAWN";
    this.treasuryBalance += penalty;

    this.privateVaultData.delete(vaultId);

    const transaction: TransactionRecord = {
      id: `withdraw-${vault.id}-${now}`,
      kind: "WITHDRAW",
      vaultId: vault.id,
      timestamp: now,
      status: "CONFIRMED",
      message: penalty > 0n
        ? `Early withdrawal settled with ${penalty.toString()} units sent to treasury.`
        : `Vault #${vault.id.toString().padStart(3, "0")} withdrawn.`,
      penaltyPaid: penalty,
      ownerPayout
    };
    this.transactions.unshift(transaction);
    return {
      vault: this.copyVault(vault),
      penalty,
      ownerPayout,
      transaction: { ...transaction }
    };
  }

  withdrawWithPenalty(vaultId: number, caller: string, callerProof: string, now = Date.now(), penaltyBps = 0): WithdrawResult {
    this.requireInitialized();
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new ContractError("VAULT_NOT_FOUND", "That vault does not exist.");
    }
    if (!this.verifyOwner(callerProof)) {
      throw new ContractError("UNAUTHORIZED", "Only the vault owner can withdraw.");
    }
    if (vault.status === "WITHDRAWN") {
      throw new ContractError("ALREADY_WITHDRAWN", "This vault has already been withdrawn.");
    }
    if (vault.lockType !== "PENALTY") {
      throw new ContractError("INVALID_LOCK_TYPE", "Only penalty vaults support early withdrawal.");
    }

    // Verify terms commitment matches
    if (!this.verifyTerms(vaultId)) {
      throw new ContractError("INVALID_TERMS", "Vault terms have been tampered with.");
    }

    const isUnlocked = now >= vault.unlockTime;
    const penalty = !isUnlocked
      ? (vault.amount * BigInt(vault.penaltyBps)) / BASIS_POINTS
      : 0n;
    const ownerPayout = vault.amount - penalty;

    vault.status = "WITHDRAWN";
    vault.withdrawnAt = now;
    vault.penaltyPaid = penalty;
    vault.ownerPayout = ownerPayout;
    vault.vaultState = isUnlocked ? "WITHDRAWN" : "PENALTY_EXECUTED";
    this.treasuryBalance += penalty;

    this.privateVaultData.delete(vaultId);

    const transaction: TransactionRecord = {
      id: `withdraw-${vault.id}-${now}`,
      kind: "PENALTY_WITHDRAW",
      vaultId: vault.id,
      timestamp: now,
      status: "CONFIRMED",
      message: penalty > 0n
        ? `Early withdrawal settled with ${penalty.toString()} units sent to treasury.`
        : `Vault #${vault.id.toString().padStart(3, "0")} withdrawn at full value.`,
      penaltyPaid: penalty,
      ownerPayout
    };
    this.transactions.unshift(transaction);
    return {
      vault: this.copyVault(vault),
      penalty,
      ownerPayout,
      transaction: { ...transaction }
    };
  }

  getVault(vaultId: number): Vault {
    this.requireInitialized();
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new ContractError("VAULT_NOT_FOUND", "That vault does not exist.");
    }
    return this.copyVault(vault);
  }

  listVaults(owner?: string): Vault[] {
    this.requireInitialized();
    return [...this.vaults.values()]
      .filter((vault) => !owner || vault.owner === owner)
      .sort((a, b) => b.id - a.id)
      .map((vault) => this.copyVault(vault));
  }

  listPublicVaults(owner?: string): PublicVault[] {
    return this.listVaults(owner).map(({ id, asset, unlockTime, lockType, status, vaultState }) => ({
      id,
      asset,
      unlockTime,
      lockType,
      status,
      vaultState
    }));
  }

  listTransactions(owner?: string): TransactionRecord[] {
    this.requireInitialized();
    const ownerVaultIds = owner
      ? new Set(this.listVaults(owner).map((vault) => vault.id))
      : undefined;
    return this.transactions
      .filter((transaction) => !ownerVaultIds || ownerVaultIds.has(transaction.vaultId))
      .map((transaction) => ({
        ...transaction,
        penaltyPaid: transaction.penaltyPaid,
        ownerPayout: transaction.ownerPayout
      }));
  }

  toJSON(): SerializedContractState {
    this.requireInitialized();
    return {
      initialized: this.initialized,
      treasury: this.treasury,
      treasuryBalance: this.treasuryBalance.toString(),
      vaultCounter: this.vaultCounter,
      userSecret: this.userSecret,
      ownerPublicKey: this.ownerPublicKey,
      vaults: [...this.vaults.values()].map((vault) => ({
        ...vault,
        vaultState: vault.vaultState,
        amount: vault.amount.toString(),
        penaltyPaid: vault.penaltyPaid?.toString(),
        ownerPayout: vault.ownerPayout?.toString()
      })),
      transactions: this.transactions.map((transaction) => ({
        ...transaction,
        penaltyPaid: transaction.penaltyPaid?.toString(),
        ownerPayout: transaction.ownerPayout?.toString()
      }))
    };
  }

  static fromJSON(state: SerializedContractState): TimeLockedVaultContract {
    const contract = new TimeLockedVaultContract();
    if (!state.initialized) return contract;
    contract.initialized = true;
    contract.treasury = state.treasury;
    contract.treasuryBalance = BigInt(state.treasuryBalance);
    contract.vaultCounter = state.vaultCounter;
    contract.userSecret = state.userSecret || "";
    contract.ownerPublicKey = state.ownerPublicKey || deriveKey(state.userSecret || "");
    contract.vaults = new Map(
      state.vaults.map((vault) => [
        vault.id,
        {
          ...vault,
          vaultState: (vault.vaultState as VaultState) || "LOCKED",
          amount: BigInt(vault.amount),
          penaltyPaid: vault.penaltyPaid === undefined ? undefined : BigInt(vault.penaltyPaid),
          ownerPayout: vault.ownerPayout === undefined ? undefined : BigInt(vault.ownerPayout)
        }
      ])
    );
    contract.transactions = state.transactions.map((transaction) => ({
      ...transaction,
      penaltyPaid: transaction.penaltyPaid === undefined ? undefined : BigInt(transaction.penaltyPaid),
      ownerPayout: transaction.ownerPayout === undefined ? undefined : BigInt(transaction.ownerPayout)
    }));
    return contract;
  }

  private verifyOwner(callerProof: string): boolean {
    return deriveKey(callerProof) === this.ownerPublicKey;
  }

  private verifyTerms(vaultId: number): boolean {
    const privateData = this.privateVaultData.get(vaultId);
    const vault = this.vaults.get(vaultId);
    if (!privateData || !vault) return false;
    const expectedTerms = persistentCommit(
      `${privateData.amount.toString()}|${vault.unlockTime.toString()}|${vault.lockType === "STRICT" ? 0 : 1}|${vault.penaltyBps.toString()}`,
      privateData.nonce
    );
    return expectedTerms === privateData.termsCommitment;
  }

  private validateCreateInput(input: CreateVaultInput, now: number): void {
    if (!input.owner.trim()) {
      throw new ContractError("UNAUTHORIZED", "A connected owner is required.");
    }
    if (!input.asset.trim()) {
      throw new ContractError("INVALID_LOCK_TYPE", "An asset is required.")
    }
    if (input.amount <= 0n) {
      throw new ContractError("INVALID_AMOUNT", "Amount must be greater than zero.");
    }
    if (!Number.isFinite(input.unlockTime) || input.unlockTime <= now) {
      throw new ContractError("INVALID_UNLOCK", "Unlock time must be in the future.");
    }
    if (input.lockType !== "STRICT" && input.lockType !== "PENALTY") {
      throw new ContractError("INVALID_LOCK_TYPE", "Unsupported withdrawal mode.");
    }
    if (!Number.isInteger(input.penaltyBps) || input.penaltyBps < 0 || input.penaltyBps > MAX_PENALTY_BPS) {
      throw new ContractError("INVALID_PENALTY", "Penalty must be between 0% and 100%.");
    }
  }

  private requireInitialized(): void {
    if (!this.initialized) {
      throw new ContractError("NOT_INITIALIZED", "The vault contract is not initialized.");
    }
  }

  private copyVault(vault: Vault): Vault {
    return { ...vault };
  }
}

export function createContract(treasuryAddress: string, userSecret = ""): TimeLockedVaultContract {
  const contract = new TimeLockedVaultContract();
  contract.initialize(treasuryAddress, userSecret);
  return contract;
}