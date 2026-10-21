/**
 * PoC aislado para SEC-009 / F4.3.
 *
 * Reproduce el hash-chaining de `src/lib/audit-logger.ts` con Node WebCrypto:
 *   hash = SHA-256(JSON.stringify({id,timestamp,userId,action,resource,
 *                                  resourceId,details,prevHash}))
 *
 * Demuestra que, al no existir HMAC ni anclaje externo, un atacante con acceso
 * de escritura a IndexedDB (`finance-pal-audit`) puede:
 *   1. editar una entrada y recalcular el hash de esa entrada y de las siguientes;
 *   2. borrar una entrada y reenlazar la cadena;
 * y `verifyAuditIntegrity()` vuelve a devolver `valid: true`.
 *
 * No usa red, ni el proyecto real, ni IndexedDB. Solo demuestra la propiedad
 * criptográfica del esquema.
 *
 * Uso: node .agent/audit/scratch/poc-sec009-tamper.mjs
 * Salida esperada: NAIVE_TAMPER_DETECTED, FORGED_CHAIN_VALID, CHAIN_FORGED_OK
 */

import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;
const GENESIS_HASH = "0".repeat(64);

async function computeHash(entry) {
  const data = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    details: entry.details,
    prevHash: entry.prevHash,
  });
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function seal(entry, prevHash) {
  const full = { ...entry, prevHash };
  full.hash = await computeHash(full);
  return full;
}

async function buildChain() {
  const base = [
    {
      id: "e1",
      timestamp: "2026-10-20T10:00:00.000Z",
      userId: "audit-user",
      action: "auth.login",
      resource: "session",
      details: { provider: "email" },
    },
    {
      id: "e2",
      timestamp: "2026-10-20T10:01:00.000Z",
      userId: "audit-user",
      action: "auth.email_changed",
      resource: "credentials",
      details: { newEmail: "old@example.test" },
    },
    {
      id: "e3",
      timestamp: "2026-10-20T10:02:00.000Z",
      userId: "audit-user",
      action: "data.export",
      resource: "export",
      details: { scopes: ["transactions"] },
    },
  ];

  const chain = [];
  let prev = GENESIS_HASH;
  for (const item of base) {
    const sealed = await seal(item, prev);
    chain.push(sealed);
    prev = sealed.hash;
  }
  return chain;
}

async function verify(chain) {
  let prevHash = GENESIS_HASH;
  for (const entry of chain) {
    const computed = await computeHash(entry);
    if (entry.prevHash !== prevHash || entry.hash !== computed) {
      return { valid: false, brokenAt: entry.id };
    }
    prevHash = entry.hash;
  }
  return { valid: true };
}

async function main() {
  const chain = await buildChain();

  const intact = await verify(chain);
  if (!intact.valid) throw new Error("fixture chain is not valid");
  console.log("cadena original:", intact);

  // 1) Edición ingenua: cambia details sin recalcular hashes.
  const naive = structuredClone(chain);
  naive[1].details.newEmail = "attacker@example.test";
  const naiveResult = await verify(naive);
  console.log("edición sin recalcular:", naiveResult);
  if (naiveResult.valid) throw new Error("naive tamper was not detected");
  console.log("NAIVE_TAMPER_DETECTED");

  // 2) Edición maliciosa: cambia details y recalcula e2/e3 (el atacante conoce
  //    el algoritmo porque está en el bundle y no hay clave secreta).
  const forged = structuredClone(chain);
  forged[1].details.newEmail = "attacker@example.test";
  forged[1].hash = await computeHash(forged[1]);
  forged[2].prevHash = forged[1].hash;
  forged[2].hash = await computeHash(forged[2]);

  const forgedResult = await verify(forged);
  console.log("edición + recálculo SHA-256:", forgedResult);
  if (!forgedResult.valid) throw new Error("forged chain was rejected (unexpected)");
  console.log("FORGED_CHAIN_VALID");

  // 3) Borrado de una entrada y reenlace de la siguiente.
  const deleted = [structuredClone(chain[0]), structuredClone(chain[2])];
  deleted[1].prevHash = deleted[0].hash;
  deleted[1].hash = await computeHash(deleted[1]);

  const deletedResult = await verify(deleted);
  console.log("entrada borrada + reenlace:", deletedResult);
  if (!deletedResult.valid) throw new Error("deleted-entry chain was rejected (unexpected)");

  console.log("CHAIN_FORGED_OK");
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});
