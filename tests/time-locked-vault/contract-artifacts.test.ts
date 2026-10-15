import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const INFO = "contracts/managed/time-locked-vault/time_locked_vault/compiler/contract-info.json";
const KEYS = "contracts/managed/time-locked-vault/time_locked_vault/keys";
const ZKIR = "contracts/managed/time-locked-vault/time_locked_vault/zkir";

describe("Wave 2 compact artifacts", () => {
  it("contract-info lists 8 circuits on runtime 0.16.0", () => {
    const info = JSON.parse(fs.readFileSync(INFO, "utf8"));
    assert.equal(info["runtime-version"], "0.16.0");
    assert.equal(info["language-version"], "0.23.0");
    const names = info.circuits.map((c: { name: string }) => c.name).sort();
    assert.deepEqual(names, [
      "createVault",
      "getTreasury",
      "getTreasuryBalance",
      "getVaultState",
      "initialize",
      "isVaultInitialized",
      "withdraw",
      "withdrawWithPenalty",
    ]);
  });

  it("keys and zkir exist for all circuits", () => {
    for (const dir of [KEYS, ZKIR]) {
      assert.ok(fs.existsSync(dir), `missing ${dir}`);
      assert.ok(fs.readdirSync(dir).length >= 8, `empty ${dir}`);
    }
  });

  it("documents Wave 2 amount-disclosure limitation", () => {
    const src = fs.readFileSync("contracts/time-locked-vault/time_locked_vault.compact", "utf8");
    assert.match(src, /disclose\(amt\)/);
    assert.ok(fs.existsSync("docs/privacy-limitation.md"));
    const doc = fs.readFileSync("docs/privacy-limitation.md", "utf8");
    assert.match(doc, /Wave 2/);
  });
});
