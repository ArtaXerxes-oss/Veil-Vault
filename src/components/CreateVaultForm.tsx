import { useState } from "react";
import { percentToBps, validateCreateForm, type CreateFormValues } from "../lib/validation";
import type { LockType } from "../types";

interface CreateVaultFormProps {
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

const initialForm: CreateFormValues = {
  asset: "NIGHT",
  amount: "",
  unlockDate: "",
  unlockTime: "",
  lockType: "STRICT",
  penaltyPercent: "5"
};

export function CreateVaultForm({ onCreate, onCreated, busy = false, ready = true, hint, buttonLabel }: CreateVaultFormProps) {
  const [form, setForm] = useState<CreateFormValues>(initialForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof CreateFormValues>(key: K, value: CreateFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors([]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) {
      setErrors(["Connect a wallet and deploy/initialize the contract before creating a vault."]);
      return;
    }
    const nextErrors = validateCreateForm(form);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      const vault = await onCreate({
        asset: form.asset,
        amount: BigInt(form.amount),
        unlockTime: new Date(`${form.unlockDate}T${form.unlockTime}`).getTime(),
        lockType: form.lockType,
        penaltyBps: form.lockType === "PENALTY" ? percentToBps(form.penaltyPercent) : 0
      });
      if (vault) onCreated(vault.id);
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || busy;

  return (
    <form className="vault-form" onSubmit={(e) => void submit(e)}>
      <div className="form-section">
        <label className="field-label" htmlFor="asset">Asset label</label>
        <select id="asset" value={form.asset} onChange={(event) => update("asset", event.target.value)} disabled={disabled}>
          <option value="NIGHT">NIGHT</option>
          <option value="tDUST">tDUST</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>
        <small className="field-help">Label only — Wave 1 locks an amount commitment on-chain via Compact witnesses.</small>
      </div>

      <div className="form-section">
        <label className="field-label" htmlFor="amount">Amount</label>
        <div className="input-with-suffix">
          <input
            id="amount"
            inputMode="numeric"
            placeholder="0"
            value={form.amount}
            disabled={disabled}
            onChange={(event) => update("amount", event.target.value.replace(/[^\d]/g, ""))}
          />
          <span>units</span>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-section">
          <label className="field-label" htmlFor="unlock-date">Unlock date</label>
          <input
            id="unlock-date"
            type="date"
            value={form.unlockDate}
            disabled={disabled}
            onChange={(event) => update("unlockDate", event.target.value)}
          />
        </div>
        <div className="form-section">
          <label className="field-label" htmlFor="unlock-time">Unlock time</label>
          <input
            id="unlock-time"
            type="time"
            value={form.unlockTime}
            disabled={disabled}
            onChange={(event) => update("unlockTime", event.target.value)}
          />
        </div>
      </div>

      <div className="form-section">
        <span className="field-label">Withdrawal rule</span>
        <div className="mode-options">
          {(["STRICT", "PENALTY"] as LockType[]).map((mode) => (
            <label className={`mode-option ${form.lockType === mode ? "selected" : ""}`} key={mode}>
              <input
                type="radio"
                name="lock-type"
                value={mode}
                checked={form.lockType === mode}
                disabled={disabled}
                onChange={() => update("lockType", mode)}
              />
              <span className="radio-dot" />
              <span>
                <strong>{mode === "STRICT" ? "Strict" : "Penalty"}</strong>
                <small>{mode === "STRICT" ? "Only withdraw after unlock" : "Early exit with a fee"}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className={`form-section penalty-field ${form.lockType === "STRICT" ? "disabled-field" : ""}`}>
        <label className="field-label" htmlFor="penalty">Penalty rate</label>
        <div className="input-with-suffix">
          <input
            id="penalty"
            type="number"
            min="0"
            max="100"
            step="0.01"
            disabled={form.lockType === "STRICT" || disabled}
            value={form.lockType === "STRICT" ? "0" : form.penaltyPercent}
            onChange={(event) => update("penaltyPercent", event.target.value)}
          />
          <span>%</span>
        </div>
      </div>

      {errors.length > 0 && <div className="form-errors">{errors.map((error) => <div key={error}>! {error}</div>)}</div>}

      <div className="privacy-callout">
        <span className="privacy-icon">⌁</span>
        <div>
          <strong>Wallet confirmation required</strong>
          <p>Create vault submits a real Compact circuit call through 1AM/Lace (prove → balance → submit).</p>
        </div>
      </div>

      {!ready && (
        <p className="field-help" style={{ margin: 0, marginBottom: 12 }}>
          {hint ?? "Connect a wallet and initialize the contract to unlock submissions. You can fill the form now."}
        </p>
      )}

      <button className="primary-button full-width" type="submit" disabled={disabled || !ready}>
        {submitting || busy ? "Awaiting wallet / proof…" : buttonLabel ?? "Create vault"} <span>↗</span>
      </button>
    </form>
  );
}
