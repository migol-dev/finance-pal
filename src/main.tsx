import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";

// Set platform guard: native Android WebView gets data-platform="native"
if (Capacitor.isNativePlatform()) {
  document.documentElement.setAttribute("data-platform", "native");
}

// Init web-vitals in production only (non-blocking)
if (import.meta.env.PROD) {
	import("./lib/web-vitals").then((m) => m.initWebVitals?.()).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
