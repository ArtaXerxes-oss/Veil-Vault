import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App";
import { WalletProvider } from "./contexts/WalletContext";
import "@midnight-ntwrk/dapp-connector-api";
import "./styles.css";

globalThis.Buffer = Buffer;
globalThis.global = globalThis;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
