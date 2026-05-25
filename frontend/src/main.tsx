import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Providers } from "./app/providers";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
);