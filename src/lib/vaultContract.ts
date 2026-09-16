import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { sampleSigningKey } from "@midnight-ntwrk/compact-runtime";
import {
  createUnprovenCallTx,
  createUnprovenDeployTx,
  submitTxAsync
} from "@midnight-ntwrk/midnight-js-contracts";
import {
  Contract,
  ledger,
  type Ledger
} from "../../contracts/managed/time-locked-vault/time_locked_vault/contract/index.js";
import type { VeilVaultPrivateState } from "../../contracts/time-locked-vault/witnesses";
import { witnesses } from "../../contracts/time-locked-vault/witnesses";
import type { ConnectedSession } from "./midnight";
import {
  PRIVATE_STATE_ID,
  ZK_ASSET_PATH,
  waitForContractDeployment,
  waitForStateAdvance,
  randomBytes32,
  hexToBytes32,
  toHex
} from "./midnight";
import type { LockType, Vault, VaultState } from "../types";

const VAULT_STATE_LABELS: VaultState[] = [
  "EMPTY",
  "LOCKED",
  "READY",
  "WITHDRAWN",
  "PENALTY_EXECUTED"
];

const PRIVATE_META_KEY = "veil-vault-private-meta-v1";

export type VaultPrivateMeta = {
  secretKeyHex: string;
  vaults: Record<
    string,
    {
      amount: string;
      nonceHex: string;
      asset: string;
      createdAt: number;
    }
  >;
};

function getCompiledContract() {
  return CompiledContract.make("TimeLockedVault", Contract).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets(ZK_ASSET_PATH)
  ) as any;
}

export function emptyPrivateState(secretKey = randomBytes32()): VeilVaultPrivateState {
  return {
    secretKey,
    amount: 0n,
    ownerProof: new Uint8Array(32),
    nonce: new Uint8Array(32),
    penalty: 0n,
    currentTime: BigInt(Date.now())
  };
}

export function loadPrivateMeta(contractAddress: string): VaultPrivateMeta | null {
  try {
    const raw = localStorage.getItem(`${PRIVATE_META_KEY}:${contractAddress}`);
    if (!raw) return null;
    return JSON.parse(raw) as VaultPrivateMeta;
  } catch {
    return null;
  }
}

export function savePrivateMeta(contractAddress: string, meta: VaultPrivateMeta): void {
  localStorage.setItem(`${PRIVATE_META_KEY}:${contractAddress}`, JSON.stringify(meta));
}

async function ensurePrivateState(
  session: ConnectedSession,
  contractAddress: string,
  patch?: Partial<VeilVaultPrivateState>
): Promise<VeilVaultPrivateState> {
  session.providers.privateStateProvider.setContractAddress(contractAddress);
  const existing = (await session.providers.privateStateProvider.get(PRIVATE_STATE_ID)) as
    | VeilVaultPrivateState
    | null;

  const meta = loadPrivateMeta(contractAddress);
  const base: VeilVaultPrivateState = existing ?? emptyPrivateState(
    meta ? hexToBytes32(meta.secretKeyHex) : randomBytes32()
  );

  const next: VeilVaultPrivateState = {
    ...base,
    ...patch,
    currentTime: patch?.currentTime ?? BigInt(Date.now())
  };

  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, next);

  if (!meta) {
    savePrivateMeta(contractAddress, {
      secretKeyHex: toHex(next.secretKey),
      vaults: {}
    });
  }

  return next;
}

export async function readLedger(
  session: ConnectedSession,
  contractAddress: string
): Promise<Ledger | null> {
  const contractState = await session.providers.publicDataProvider.queryContractState(contractAddress);
  if (!contractState?.data) return null;
  return ledger(contractState.data);
}

function mapVaultState(value: number): VaultState {
  return VAULT_STATE_LABELS[value] ?? "EMPTY";
}

export async function listOnChainVaults(
  session: ConnectedSession,
  contractAddress: string
): Promise<{ vaults: Vault[]; treasury: { address: string; balance: bigint }; initialized: boolean }> {
  const chain = await readLedger(session, contractAddress);
  const meta = loadPrivateMeta(contractAddress);
  if (!chain) {
    return { vaults: [], treasury: { address: "", balance: 0n }, initialized: false };
  }

  const vaults: Vault[] = [];
  const count = Number(chain.vaultCounter);
  for (let id = 1; id <= count; id++) {
    const key = BigInt(id);
    if (!chain.vaultState.member(key)) continue;
    const lockTypeNum = Number(chain.vaultLockType.lookup(key));
    const vaultState = mapVaultState(chain.vaultState.lookup(key));
    const privateVault = meta?.vaults[String(id)];
    vaults.push({
      id,
      owner: toHex(chain.vaultOwner.lookup(key)),
      asset: privateVault?.asset ?? "NIGHT",
      amount: chain.vaultAmount.lookup(key),
      unlockTime: Number(chain.vaultUnlockTime.lookup(key)),
      lockType: lockTypeNum === 1 ? "PENALTY" : "STRICT",
      penaltyBps: Number(chain.vaultPenaltyBps.lookup(key)),
      status: vaultState === "WITHDRAWN" || vaultState === "PENALTY_EXECUTED" ? "WITHDRAWN" : "ACTIVE",
      vaultState,
      createdAt: privateVault?.createdAt ?? 0
    });
  }

  return {
    vaults: vaults.sort((a, b) => b.id - a.id),
    treasury: {
      address: toHex(chain.treasury),
      balance: chain.treasuryBalance
    },
    initialized: chain.initialized
  };
}

export async function deployVaultContract(
  session: ConnectedSession,
  onProgress?: (message: string) => void
): Promise<{ contractAddress: string; txId: string; secretKeyHex: string }> {
  onProgress?.("Building deploy transaction…");
  const compiledContract = getCompiledContract();
  const secretKey = randomBytes32();
  const initialPrivateState = emptyPrivateState(secretKey);

  const deployTxData = await createUnprovenDeployTx(
    {
      zkConfigProvider: session.providers.zkConfigProvider,
      walletProvider: session.providers.walletProvider
    } as any,
    {
      compiledContract,
      signingKey: sampleSigningKey(),
      initialPrivateState
    } as any
  );

  const contractAddress = deployTxData.public.contractAddress;
  onProgress?.(`Submitting deploy (${contractAddress.slice(0, 12)}…)…`);

  const txId = await submitTxAsync(session.providers as any, {
    unprovenTx: deployTxData.private.unprovenTx
  });

  await session.providers.privateStateProvider.setContractAddress(contractAddress);
  await session.providers.privateStateProvider.setSigningKey(
    contractAddress,
    deployTxData.private.signingKey
  );
  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, initialPrivateState);

  savePrivateMeta(contractAddress, {
    secretKeyHex: toHex(secretKey),
    vaults: {}
  });

  onProgress?.("Waiting for indexer…");
  await waitForContractDeployment(session.providers.publicDataProvider, contractAddress);

  return { contractAddress, txId, secretKeyHex: toHex(secretKey) };
}

export async function initializeVaultContract(
  session: ConnectedSession,
  contractAddress: string,
  treasuryHex: string,
  onProgress?: (message: string) => void
): Promise<string> {
  onProgress?.("Preparing initialize circuit…");
  const compiledContract = getCompiledContract();
  const treasuryAddr = hexToBytes32(treasuryHex);
  await ensurePrivateState(session, contractAddress);

  const before = await readLedger(session, contractAddress);

  const callTxData = await createUnprovenCallTx(session.providers as any, {
    compiledContract,
    contractAddress,
    circuitId: "initialize",
    args: [treasuryAddr],
    privateStateId: PRIVATE_STATE_ID
  } as any);

  onProgress?.("Proving and submitting initialize…");
  const txId = await submitTxAsync(session.providers as any, {
    unprovenTx: callTxData.private.unprovenTx,
    circuitId: "initialize"
  });

  await waitForStateAdvance(session.providers.publicDataProvider, async (provider) => {
    const state = await provider.queryContractState(contractAddress);
    if (!state?.data) return false;
    const current = ledger(state.data);
    return current.initialized && current.initialized !== before?.initialized;
  });

  return txId;
}

export async function createVaultOnChain(
  session: ConnectedSession,
  contractAddress: string,
  input: {
    amount: bigint;
    unlockTime: number;
    lockType: LockType;
    penaltyBps: number;
    asset: string;
  },
  onProgress?: (message: string) => void
): Promise<{ vaultId: number; txId: string }> {
  const chain = await readLedger(session, contractAddress);
  if (!chain?.initialized) throw new Error("Contract is not initialized. Deploy and initialize first.");

  const vaultId = Number(chain.vaultCounter) + 1;
  const nonce = randomBytes32();
  const lockType = input.lockType === "PENALTY" ? 1n : 0n;
  const penaltyBps = BigInt(input.lockType === "PENALTY" ? input.penaltyBps : 0);

  await ensurePrivateState(session, contractAddress, {
    amount: input.amount,
    nonce,
    currentTime: BigInt(Date.now()),
    penalty: 0n
  });

  onProgress?.(`Creating vault #${vaultId}…`);
  const compiledContract = getCompiledContract();
  const callTxData = await createUnprovenCallTx(session.providers as any, {
    compiledContract,
    contractAddress,
    circuitId: "createVault",
    args: [BigInt(vaultId), input.amount, BigInt(input.unlockTime), lockType, penaltyBps],
    privateStateId: PRIVATE_STATE_ID
  } as any);

  const txId = await submitTxAsync(session.providers as any, {
    unprovenTx: callTxData.private.unprovenTx,
    circuitId: "createVault"
  });

  await waitForStateAdvance(session.providers.publicDataProvider, async (provider) => {
    const state = await provider.queryContractState(contractAddress);
    if (!state?.data) return false;
    return Number(ledger(state.data).vaultCounter) >= vaultId;
  });

  const meta = loadPrivateMeta(contractAddress) ?? {
    secretKeyHex: toHex((await ensurePrivateState(session, contractAddress)).secretKey),
    vaults: {}
  };
  meta.vaults[String(vaultId)] = {
    amount: input.amount.toString(),
    nonceHex: toHex(nonce),
    asset: input.asset,
    createdAt: Date.now()
  };
  savePrivateMeta(contractAddress, meta);

  return { vaultId, txId };
}

export async function withdrawOnChain(
  session: ConnectedSession,
  contractAddress: string,
  vaultId: number,
  mode: "withdraw" | "penalty",
  onProgress?: (message: string) => void
): Promise<{ txId: string }> {
  const meta = loadPrivateMeta(contractAddress);
  const vaultMeta = meta?.vaults[String(vaultId)];
  if (!vaultMeta) {
    throw new Error("Missing private vault data for this browser. Withdrawals require the original private state.");
  }

  const chain = await readLedger(session, contractAddress);
  if (!chain) throw new Error("Could not read contract state.");

  const amount = chain.vaultAmount.lookup(BigInt(vaultId));
  const unlockTime = Number(chain.vaultUnlockTime.lookup(BigInt(vaultId)));
  const penaltyBps = Number(chain.vaultPenaltyBps.lookup(BigInt(vaultId)));
  const now = Date.now();
  const penalty =
    mode === "penalty" && now < unlockTime
      ? (amount * BigInt(penaltyBps)) / 10000n
      : 0n;

  await ensurePrivateState(session, contractAddress, {
    amount,
    nonce: hexToBytes32(vaultMeta.nonceHex),
    currentTime: BigInt(now),
    penalty
  });

  const circuitId = mode === "penalty" ? "withdrawWithPenalty" : "withdraw";
  const args = mode === "penalty" ? [BigInt(vaultId), BigInt(penaltyBps)] : [BigInt(vaultId)];

  onProgress?.(`Submitting ${circuitId}…`);
  const compiledContract = getCompiledContract();
  const beforeState = chain.vaultState.lookup(BigInt(vaultId));

  const callTxData = await createUnprovenCallTx(session.providers as any, {
    compiledContract,
    contractAddress,
    circuitId,
    args,
    privateStateId: PRIVATE_STATE_ID
  } as any);

  const txId = await submitTxAsync(session.providers as any, {
    unprovenTx: callTxData.private.unprovenTx,
    circuitId
  });

  await waitForStateAdvance(session.providers.publicDataProvider, async (provider) => {
    const state = await provider.queryContractState(contractAddress);
    if (!state?.data) return false;
    const current = ledger(state.data).vaultState.lookup(BigInt(vaultId));
    return current !== beforeState;
  });

  return { txId };
}
