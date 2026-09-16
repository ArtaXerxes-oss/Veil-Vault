import { Link } from "../App";
import { formatDate } from "../lib/format";
import type { TxLogEntry } from "../lib/midnight";

export function History({ transactions }: { transactions: TxLogEntry[] }) {
  return (
    <section className="content-section history-page">
      <div className="page-intro compact-intro">
        <p className="section-kicker">AUDIT TRAIL</p>
        <h1>Transaction history</h1>
        <p className="intro-copy">Local log of real deploy / circuit transactions submitted through your wallet.</p>
      </div>
      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-orbit">⌁</div>
          <h3>No transactions yet.</h3>
          <p>Deploy the contract or create a vault to see activity here.</p>
          <Link href="#/deploy" className="secondary-button">Open deploy <span>→</span></Link>
        </div>
      ) : (
        <div className="history-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vault</th>
                <th>Action</th>
                <th>Date</th>
                <th>Result</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={`${transaction.id}-${transaction.timestamp}`}>
                  <td className="mono">
                    {transaction.vaultId !== undefined ? `#${String(transaction.vaultId).padStart(3, "0")}` : "—"}
                  </td>
                  <td>{labelForKind(transaction.kind)}</td>
                  <td>{formatDate(transaction.timestamp)}</td>
                  <td>
                    <span className="table-success">
                      {transaction.status === "CONFIRMED" ? "✓ Confirmed" : transaction.status}
                    </span>
                  </td>
                  <td className="mono" title={transaction.txHash ?? transaction.id}>
                    {(transaction.txHash ?? transaction.id).slice(0, 16)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function labelForKind(kind: TxLogEntry["kind"]): string {
  switch (kind) {
    case "DEPLOY":
      return "Deploy";
    case "INITIALIZE":
      return "Initialize";
    case "CREATE":
      return "Created";
    case "WITHDRAW":
      return "Withdrawn";
    case "PENALTY_WITHDRAW":
      return "Penalty withdraw";
    default:
      return kind;
  }
}
