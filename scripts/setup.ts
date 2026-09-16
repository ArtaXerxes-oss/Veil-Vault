#!/usr/bin/env tsx
export {};

async function main() {
  console.log("VEIL Vault setup");
  console.log("");
  console.log("- Install 1AM or Lace Midnight wallet extension");
  console.log("- Copy .env.example → .env and set VITE_MIDNIGHT_NETWORK");
  console.log("- npm install && npm run sync:zk && npm run dev");
  console.log("- Open #/deploy to deploy the Compact contract with your wallet");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
