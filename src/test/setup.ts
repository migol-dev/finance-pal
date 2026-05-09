import "@testing-library/jest-dom";

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

// Fijar la fecha global para pruebas (evita falsos positivos en snapshots depend
//ientes de la fecha/hora). Usa una fecha consistente usada en snapshots.
const FIXED_NOW = new Date("2026-05-07T12:00:00Z").getTime();
Date.now = () => FIXED_NOW;
