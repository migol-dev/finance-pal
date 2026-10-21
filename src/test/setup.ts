import "@testing-library/jest-dom";
import "./indexeddb-polyfill";

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, String(value));
    },
  };
}

function installStorageFallback(name: "localStorage" | "sessionStorage"): void {
  try {
    if (typeof globalThis[name] !== "undefined") return;
  } catch {
    // Accessing the Node 26 experimental storage global can throw.
  }
  Object.defineProperty(globalThis, name, {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });
}

installStorageFallback("localStorage");
installStorageFallback("sessionStorage");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

window.prompt = () => "mock-secret";

// Fijar la fecha global para pruebas (evita falsos positivos en snapshots depend
//ientes de la fecha/hora). Usa una fecha consistente usada en snapshots.
const FIXED_NOW = new Date("2026-05-07T12:00:00Z").getTime();
Date.now = () => FIXED_NOW;
