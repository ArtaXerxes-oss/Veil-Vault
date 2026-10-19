import type { AppNotice } from "../lib/useVaultApp";
import type { TxPhase } from "../types";

export const PHASE_LABELS: Record<string, { label: string; detail: string }> = {
  proving: { label: "Generating ZK Proof", detail: "Prover is constructing the circuit proof locally…" },
  balancing: { label: "Balancing Transaction", detail: "Wallet is balancing unsealed coins and fee…" },
  submitting: { label: "Submitting to Midnight", detail: "Broadcasting transaction to Midnight network…" },
  confirming: { label: "Awaiting Confirmation", detail: "Waiting for block inclusion and indexer sync…" }
};

export interface TransactionStatusProps {
  notice?: AppNotice | null;
  onDismiss?: () => void;
  message?: string | null;
  phase?: TxPhase;
}

export function TransactionStatus({ notice, onDismiss, message, phase }: TransactionStatusProps) {
  if (!notice && !message && !phase) return null;

  return (
    <>
      {notice && (
        <div className={`transaction-notice ${notice.tone}`} role="status">
          <div className="notice-symbol">{notice.tone === "success" ? "✓" : notice.tone === "error" ? "!" : "i"}</div>
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </div>
          {onDismiss && (
            <button className="notice-close" onClick={onDismiss} aria-label="Dismiss notification">
              ×
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function PendingIntentBanner({ phase, message }: { phase?: TxPhase; message?: string | null }) {
  if (!phase && !message) return null;

  const steps = ["proving", "balancing", "submitting", "confirming"] as const;
  const currentIdx = phase ? steps.indexOf(phase as (typeof steps)[number]) : -1;
  const currentInfo = phase ? PHASE_LABELS[phase] : null;

  return (
    <div className="pending-intent-banner">
      <div className="pending-intent-header">
        <span className="pending-spinner" />
        <div>
          <strong>{currentInfo?.label ?? "Transaction in progress"}</strong>
          <p>{currentInfo?.detail ?? message}</p>
        </div>
      </div>
      <div className="tx-phase-track">
        {steps.map((step, idx) => {
          const isDone = currentIdx > idx;
          const isActive = currentIdx === idx;
          return (
            <div key={step} className={`tx-phase-pill ${isDone ? "done" : isActive ? "active" : ""}`}>
              <span className="pill-dot">{isDone ? "✓" : idx + 1}</span>
              <span className="pill-name">{PHASE_LABELS[step].label.replace("Generating ", "").replace(" to Midnight", "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}