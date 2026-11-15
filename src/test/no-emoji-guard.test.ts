import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(__dirname, "..");

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(fullPath, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

function listNonClassicUiAndNotifFiles(): string[] {
  const candidates = [
    ...walkTsFiles(path.join(SRC_ROOT, "components")),
    ...walkTsFiles(path.join(SRC_ROOT, "pages")),
    path.join(SRC_ROOT, "lib", "notifications.ts"),
  ];
  return candidates.filter(
    (filePath) => !filePath.endsWith("Classic.tsx") && !filePath.endsWith("Classic.ts")
  );
}

describe("no-emoji-guard (V2 UI & notifications)", () => {
  it("contiene 0 caracteres Unicode pictográficos/emojis en componentes no-Classic, páginas y notificaciones", () => {
    const emojiRe = /\p{Extended_Pictographic}/u;
    const files = listNonClassicUiAndNotifFiles();
    const violations: string[] = [];

    for (const filePath of files) {
      const rel = path.relative(SRC_ROOT, filePath);
      const lines = fs.readFileSync(filePath, "utf8").split("\n");
      lines.forEach((line, idx) => {
        if (emojiRe.test(line)) {
          violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("no referencia PAYMENT_METHOD_EMOJI, CATEGORY_EMOJI ni emojiFor( fuera de vistas Classic", () => {
    const legacyHelperRe = /\b(PAYMENT_METHOD_EMOJI|CATEGORY_EMOJI|emojiFor)\b/;
    const files = listNonClassicUiAndNotifFiles();
    const violations: string[] = [];

    for (const filePath of files) {
      const rel = path.relative(SRC_ROOT, filePath);
      const lines = fs.readFileSync(filePath, "utf8").split("\n");
      lines.forEach((line, idx) => {
        if (legacyHelperRe.test(line)) {
          violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
