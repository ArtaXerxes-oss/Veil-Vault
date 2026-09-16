#!/usr/bin/env tsx
/**
 * Points operators at the in-browser Deploy page.
 * Real Compact deploy runs through 1AM/Lace on http://localhost:5173/#/deploy
 */
export {};

async function main() {
  console.log("VEIL Vault — real Compact deploy");
  console.log("");
  console.log("1. npm run sync:zk && npm run dev");
  console.log("2. Install/unlock 1AM or Lace Midnight wallet");
  console.log("3. Open http://localhost:5173/#/deploy (or the port Vite prints)");
  console.log("4. Connect wallet → Deploy → Initialize treasury");
  console.log("");
  console.log("Network must match the wallet extension (preview / preprod / undeployed).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
