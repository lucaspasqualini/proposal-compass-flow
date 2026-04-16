import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearPersistedFilters } from "./hooks/usePersistedState";

// Reset filtros persistidos quando o usuário recarrega a página (F5 / refresh)
try {
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (navEntries[0]?.type === "reload") {
    clearPersistedFilters();
  }
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(<App />);
