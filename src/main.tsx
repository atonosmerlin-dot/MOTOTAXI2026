import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/push-debug"; // Load push debug commands

// Register service worker if available
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
	});
}

// Capture beforeinstallprompt for later use by UI
window.addEventListener('beforeinstallprompt', (e: any) => {
	e.preventDefault();
	// @ts-ignore
	window.__deferredPwaPrompt = e;
	window.dispatchEvent(new CustomEvent('pwa-available'));
});

createRoot(document.getElementById("root")!).render(<App />);
