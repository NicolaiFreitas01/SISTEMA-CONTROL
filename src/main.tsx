import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Provider } from "./lib/store";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error)
      return (
        <main className="fatal">
          <h1>Não foi possível abrir o Control.</h1>
          <p>{this.state.error}</p>
          <button onClick={() => location.reload()}>Tentar novamente</button>
        </main>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider>
        <App />
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
