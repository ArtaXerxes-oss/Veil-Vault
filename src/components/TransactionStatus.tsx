import type { AppNotice } from "../lib/useVaultApp";

export function TransactionStatus({ notice, onDismiss }: { notice: AppNotice | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div className={`transaction-notice ${notice.tone}`} role="status">
      <div className="notice-symbol">{notice.tone === "success" ? "✓" : notice.tone === "error" ? "!" : "i"}</div>
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.body}</p>
      </div>
      <button className="notice-close" onClick={onDismiss} aria-label="Dismiss notification">×</button>
    </div>
  );
}