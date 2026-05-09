import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Init web-vitals in production only (non-blocking)
if (import.meta.env.PROD) {
	import("./lib/web-vitals").then((m) => m.initWebVitals?.()).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
