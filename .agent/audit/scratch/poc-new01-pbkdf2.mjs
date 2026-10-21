/**
 * PoC aislado para NEW-01 / SEC-002 (F4.2).
 *
 * Demuestra que el cifrado "en reposo" de Finance Pal se puede descifrar con
 * material que también está en el cliente:
 *   - `user.id` (UUID público incluido en el JWT de Supabase, persistido en
 *     localStorage bajo `sb-<project-ref>-auth-token`), o
 *   - `finance-pal-device-secret` (fallback cuando no hay sesión).
 *   - El salt y las iteraciones son públicos: `finance-pal-encrypted-v1-salt`.
 *
 * No usa ningún secreto externo, ni red, ni el proyecto real. El fixture fue
 * generado con el mismo algoritmo de `src/lib/encrypted-storage.ts`:
 * PBKDF2-SHA256 (600.000 iteraciones) -> AES-256-GCM (IV 12 bytes).
 *
 * Uso: node .agent/audit/scratch/poc-new01-pbkdf2.mjs
 * Salida esperada: "DECRYPTED_OK" y el JSON de prueba.
 */

import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;
const textEncoder = new TextEncoder();

// Constantes copiadas de src/lib/encrypted-storage.ts (L21-L28)
const KEY_DERIVATION_ITERATIONS = 600000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Fixture sintético: usuario de auditoría, sin PII real.
const FIXTURE = {
  userId: "11111111-1111-4111-8111-111111111111",
  saltB64: "y3HYBfu3o97k7tqJ0pqReQ==",
  iterations: 600000,
  ciphertextB64:
    "J4u7jM1DVufPqAULUuTQxS3VgNF7yCHsDz/b8T+Eki4Agjyk9nsZx+nB8wuh5yVq8QuxwfDd6EV104NhkaU83VF9iKFisp03uwvw21NqlyEsnZwjEILMM2JZLp7zrSkNf4+z9mN9H7OmcxAQlWyVqPXvTHr9ETdq4a3LSLf508h88rBCrn1KkggbL3vK+1vV138t+PjhOxEYtXvscFzbSO0EaEUfNzeFWhxHoKCtjlLAxzwE8plTtTqIBA==",
  expected: {
    profile: { name: "Audit User", email: "audit@example.test", currency: "MXN" },
    transactions: [{ id: "tx-audit-1", amount: 123.45, description: "PoC NEW-01" }],
  },
};

function b64ToBytes(b64) {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

async function deriveKey(secret, salt, iterations) {
  const keyMaterial = await subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["decrypt"],
  );
}

async function decrypt(combinedB64, key) {
  const combined = b64ToBytes(combinedB64);
  if (combined.length < IV_LENGTH + 16) throw new Error("invalid ciphertext");
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

async function main() {
  const salt = b64ToBytes(FIXTURE.saltB64);
  const key = await deriveKey(FIXTURE.userId, salt, FIXTURE.iterations);
  const plaintext = await decrypt(FIXTURE.ciphertextB64, key);
  const parsed = JSON.parse(plaintext);

  console.log("material público usado:");
  console.log("  user.id  =", FIXTURE.userId);
  console.log("  salt     =", FIXTURE.saltB64, `(iterations=${FIXTURE.iterations})`);
  console.log("  ciphertext bytes =", b64ToBytes(FIXTURE.ciphertextB64).length);
  console.log("plaintext descifrado:");
  console.log(JSON.stringify(parsed, null, 2));

  const ok = JSON.stringify(parsed) === JSON.stringify(FIXTURE.expected);
  if (!ok) {
    console.error("DECRYPT_MISMATCH");
    process.exit(1);
  }

  // Prueba negativa: con otro user.id la clave es distinta y AES-GCM falla.
  try {
    const wrongKey = await deriveKey(
      "22222222-2222-4222-8222-222222222222",
      salt,
      FIXTURE.iterations,
    );
    await decrypt(FIXTURE.ciphertextB64, wrongKey);
    console.error("UNEXPECTED_DECRYPT_WITH_WRONG_USER");
    process.exit(1);
  } catch {
    console.log("wrong-user-id -> decrypt rejected (expected)");
  }

  console.log("DECRYPTED_OK");
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});
