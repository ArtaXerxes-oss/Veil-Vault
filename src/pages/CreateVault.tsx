import { Link } from "../App";
import { CreateVaultForm } from "../components/CreateVaultForm";
import type { LockType } from "../types";

interface CreateVaultProps {
  onCreate: (input: {
    asset: string;
    amount: bigint;
    unlockTime: number;
    lockType: LockType;
    penaltyBps: number;
  }) => Promise<{ id: number } | null>;
  onCreated: (id: number) => void;
  busy?: boolean;
  ready?: boolean;
  hint?: string;
  buttonLabel?: string;
}

export function CreateVault({ onCreate, onCreated, busy, ready, hint, buttonLabel }: CreateVaultProps) {
  return (
    <section className="narrow-page">
      <Link href="#/" className="back-link">← Back to vaults</Link>
      <div className="page-intro compact-intro">
        <p className="section-kicker">NEW POSITION</p>
        <h1>Create private vault</h1>
        <p className="intro-copy">
          Submits a real Compact <code>createVault</code> circuit through your connected Midnight wallet.
        </p>
      </div>
      <CreateVaultForm onCreate={onCreate} onCreated={onCreated} busy={busy} ready={ready} hint={hint} buttonLabel={buttonLabel} />
    </section>
  );
}
