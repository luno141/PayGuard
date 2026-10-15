import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AnalystApp from "../src/AnalystApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AnalystApp />
  </StrictMode>
);
