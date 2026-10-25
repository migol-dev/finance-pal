import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { getClientIdentifier, rateLimiter } from "@/lib/rate-limiter";

// OAuth Redirect URI allowlist — exact matches only (prevents open redirects).
export const NATIVE_REDIRECT_URIS = new Set([
  "app.financepal.com://auth/callback", // Native Android app (registered manifest scheme)
  "financepal://auth/callback", // Legacy/alternate native scheme
]);

export const WEB_REDIRECT_ORIGINS = new Set([
  "https://finance-pal.app",
  "https://financepal-web.vercel.app",
]);

export const DEV_REDIRECT_PORTS = new Set(["5173", "8080", "3000"]);

export function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);

    // Custom native schemes must match the exact registered callback.
    if (NATIVE_REDIRECT_URIS.has(uri)) return true;

    if (parsed.pathname !== "/auth/callback") return false;

    // Production web origins.
    if (parsed.protocol === "https:" && WEB_REDIRECT_ORIGINS.has(parsed.origin)) return true;

    // Current web origin (e.g. self-hosted deployment).
    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin &&
      parsed.protocol === window.location.protocol
    ) {
      return true;
    }

    // Development only: localhost with the known Vite/legacy ports.
    if (
      import.meta.env.DEV &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      DEV_REDIRECT_PORTS.has(parsed.port)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function getValidatedRedirectUri(_provider: "google" | "github"): string {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const redirectUri = "app.financepal.com://auth/callback";
    if (!isValidRedirectUri(redirectUri)) {
      throw new Error("URI de redirección nativa no permitida");
    }
    return redirectUri;
  }

  // Web: use VITE_PUBLIC_URL or current origin
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const redirectUri = `${baseUrl}/auth/callback`;

  if (!isValidRedirectUri(redirectUri)) {
    throw new Error(`URI de redirección no permitida: ${redirectUri}. Configure VITE_PUBLIC_URL correctamente.`);
  }
  return redirectUri;
}

export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];
  if (password.length >= 12) score += 1;
  else feedback.push("Al menos 12 caracteres");
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Minúsculas");
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Mayúsculas");
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Números");
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push("Símbolos");
  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1);
  if (/^(?:password|123456|qwerty|admin|finance)/i.test(password)) score = 0;

  const labels = ["Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
  const colors = [
    "text-destructive",
    "text-orange-500",
    "text-yellow-500",
    "text-lime-500",
    "text-green-500",
  ];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
    feedback,
  };
}

/** Never leak raw backend auth errors to the UI (SEC-008). */
export function getSafeAuthError(error: unknown, fallback: string): string {
  const message = String((error as { message?: unknown })?.message ?? "");
  if (/invalid login credentials/i.test(message)) return "Credenciales inválidas";
  if (/email not confirmed/i.test(message)) return "Debes confirmar tu correo antes de iniciar sesión";
  if (/user already registered/i.test(message)) return "Ya existe una cuenta con este correo";
  if (/password/i.test(message) && /(weak|short|least|requirement)/i.test(message)) {
    return "La contraseña no cumple los requisitos de seguridad";
  }
  if (/rate limit|too many requests/i.test(message)) {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo";
  }
  return fallback;
}

export async function checkAuthRateLimit(identifier: string): Promise<boolean> {
  const limit = await rateLimiter.checkLimit(`${getClientIdentifier()}:${identifier}`, "auth");
  if (!limit.allowed) {
    toast.error(`Demasiados intentos. Espera ${limit.retryAfter ?? 60} segundos.`);
    return false;
  }
  return true;
}
