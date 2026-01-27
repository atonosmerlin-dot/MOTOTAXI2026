import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/push-debug"; // Load push debug commands


// PWA functionality is handled by vite-plugin-pwa and ReloadPrompt/InstallPrompt components

createRoot(document.getElementById("root")!).render(<App />);
