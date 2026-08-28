import { supabase } from "./supabase";
import { Capacitor } from "@capacitor/core";

export const VAPID_PUBLIC_KEY = "BMUHTb6chM9wLrlPRoNZMiWbiC7jNM49nnOq2YT8ptuuwFOgqUj3V3Wle4X7Gtah-1WaiaKzczbEE-Ygeq1iIZY";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra el Service Worker y suscribe el navegador a Web Push en Supabase
 */
export async function subscribeToWebPush(): Promise<PushSubscription | null> {
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[WebPush] Web Push no es soportado por este navegador.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // Verificar si ya existe una suscripción activa
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // Guardar o actualizar la suscripción en Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id && subscription) {
      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (endpoint && p256dh && auth) {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: session.user.id,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" }
        );
        console.log("[WebPush] Suscripción registrada en Supabase exitosamente.");
      }
    }

    return subscription;
  } catch (error) {
    console.warn("[WebPush] Error al registrar suscripción Web Push:", error);
    return null;
  }
}

/**
 * Desuscribe el navegador de Web Push y remueve el registro de Supabase
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return false;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Eliminar de Supabase
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      console.log("[WebPush] Suscripción eliminada exitosamente.");
      return true;
    }
  } catch (error) {
    console.warn("[WebPush] Error al desuscribir Web Push:", error);
  }
  return false;
}
