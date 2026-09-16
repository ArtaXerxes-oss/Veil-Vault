import type { WalletFacade, FacadeState, UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk';
import type { ZswapSecretKeys, DustSecretKey } from '@midnight-ntwrk/ledger-v7';
import { FluentWalletBuilder, type DustWalletOptions } from '@midnight-ntwrk/testkit-js';
import { LedgerParameters } from '@midnight-ntwrk/ledger-v7';
import * as Rx from 'rxjs';

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ZswapSecretKeys;
  dustSecretKey: DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

export interface Config {
  networkId: string;
  node: string;
  indexer: string;
  indexerWS: string;
  proofServer: string;
}

const DUST_OPTIONS: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

function isStrictlyComplete(progress: unknown): boolean {
  if (!progress || typeof progress !== 'object') return false;
  const fn = (progress as { isStrictlyComplete?: unknown }).isStrictlyComplete;
  return typeof fn === 'function' && (fn as () => boolean).call(progress);
}

const DEFAULT_WAIT_TIMEOUT_MS = 300_000;

const firstValueFromBounded = <T>(
  observable: Rx.Observable<T>,
  label: string,
  timeout: number = DEFAULT_WAIT_TIMEOUT_MS,
): Promise<T> =>
  Rx.firstValueFrom(
    observable.pipe(
      Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(() => new Error(`${label} timed out after ${timeout}ms`)),
      }),
    ),
  );

export async function buildWallet(config: Config, seed: string): Promise<WalletContext> {
  const base = FluentWalletBuilder.forEnvironment({
    networkId: config.networkId,
    node: config.node,
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    proofServer: config.proofServer,
  }).withDustOptions(DUST_OPTIONS);

  const { wallet, seeds, keystore } = await base.withSeed(seed).buildWithoutStarting();

  const shieldedSecretKeys = seeds.shielded;
  const dustSecretKey = seeds.dust;

  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore: keystore };
}

export async function waitForSync(wallet: WalletFacade, timeout = DEFAULT_WAIT_TIMEOUT_MS): Promise<FacadeState> {
  return firstValueFromBounded(
    wallet.state().pipe(
      Rx.filter(
        (state) =>
          isStrictlyComplete(state.shielded.state.progress) &&
          isStrictlyComplete(state.unshielded.progress) &&
          isStrictlyComplete(state.dust.state.progress)
      )
    ),
    'Wallet sync',
    timeout
  );
}

export async function waitForFunds(wallet: WalletFacade, timeout = DEFAULT_WAIT_TIMEOUT_MS): Promise<void> {
  await firstValueFromBounded(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.map((s: { shielded?: { balances: Record<string, bigint> }; unshielded?: { balances: Record<string, bigint> } }) => {
        const unshielded = s.unshielded?.balances ?? {};
        const shielded = s.shielded?.balances ?? {};
        let total = 0n;
        for (const v of Object.values(unshielded)) total += v;
        for (const v of Object.values(shielded)) total += v;
        return total;
      }),
      Rx.filter((balance) => balance > 0n)
    ),
    'Wait for funds',
    timeout
  );
}

export async function registerDust(walletContext: WalletContext): Promise<void> {
  const state = await waitForSync(walletContext.wallet);
  const unregisteredNightUtxos = state.unshielded?.availableCoins.filter(
    (coin) => coin.meta.registeredForDustGeneration === false
  ) ?? [];

  if (unregisteredNightUtxos.length === 0) {
    return;
  }

  const recipe = await walletContext.wallet.registerNightUtxosForDustGeneration(
    unregisteredNightUtxos,
    walletContext.unshieldedKeystore.getPublicKey(),
    (payload) => walletContext.unshieldedKeystore.signData(payload),
  );

  const finalizedTx = await walletContext.wallet.finalizeRecipe(recipe);
  await walletContext.wallet.submitTransaction(finalizedTx);
  await waitForSync(walletContext.wallet);
}

export function createConfig(): Config {
  return {
    networkId: process.env.VITE_MIDNIGHT_NETWORK_ID || 'testnet',
    node: process.env.VITE_MIDNIGHT_NODE || 'http://localhost:9944',
    indexer: process.env.VITE_MIDNIGHT_INDEXER || 'http://localhost:8080',
    indexerWS: process.env.VITE_MIDNIGHT_INDEXER_WS || 'ws://localhost:9945',
    proofServer: process.env.VITE_MIDNIGHT_PROOF_SERVER || 'http://localhost:6300',
  };
}

export function getWalletSeed(): string {
  return process.env.VITE_WALLET_SEED || process.env.DEPLOY_SEED || '';
}

export function getTreasuryAddress(): string {
  return process.env.VITE_TREASURY_ADDRESS || '';
}