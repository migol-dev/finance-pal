import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { useFinance } from "@/store/finance-store";
import { SplashScreen } from "./SplashScreen";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App as CapacitorApp } from "@capacitor/app";
import { toast } from "sonner";

const SWIPE_ROUTES = ["/", "/movimientos", "/deudas", "/metas", "/ajustes"];

export function AppShell({ children }: { children: ReactNode }) {
  const setActive = useFinance((s) => s.setActive);
  const theme = useFinance((s) => s.theme);
  const accentColor = useFinance((s) => s.appSettings.accentColor);
  const compactMode = useFinance((s) => s.appSettings.compactMode);
  const didInit = useRef(false);
  const [booting, setBooting] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastBackPressRef = useRef<number | null>(null);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const d = new Date();
    setActive(d.getFullYear(), d.getMonth());

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().catch(console.warn);
    }

    const t = setTimeout(() => setBooting(false), 900);
    return () => clearTimeout(t);
  }, [setActive]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0a0e1a" : "#ffffff");
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.className.split(" ").filter(c => c.startsWith("accent-")).forEach(c => root.classList.remove(c));
    root.classList.add(`accent-${accentColor}`);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    if (compactMode) root.classList.add("compact"); else root.classList.remove("compact");
  }, [compactMode]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener('backButton', () => {
      const topRoutes = SWIPE_ROUTES;
      if (!topRoutes.includes(location.pathname)) {
        navigate(-1);
        return;
      }
      const now = Date.now();
      if (lastBackPressRef.current && now - lastBackPressRef.current < 2000) {
        try { CapacitorApp.exitApp(); } catch (_e) { (navigator as any)['app']?.exitApp?.(); }
        return;
      }
      lastBackPressRef.current = now;
      toast('Pulsa de nuevo para salir');
      setTimeout(() => { lastBackPressRef.current = null; }, 2000);
    });
    return () => { listener.then(h => h.remove()); };
  }, [location.pathname, navigate]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current; touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5 || dt > 600) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input,textarea,select,[role="dialog"],.no-swipe')) return;
    const idx = SWIPE_ROUTES.indexOf(location.pathname);
    if (idx === -1) return;
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next < 0 || next >= SWIPE_ROUTES.length) return;
    navigate(SWIPE_ROUTES[next]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {booting && <SplashScreen />}
      <div className="lg:flex lg:h-screen lg:overflow-hidden">
        <DesktopSidebar />
        <main
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="flex-1 lg:overflow-y-auto lg:h-screen"
        >
          <div className="mx-auto w-full min-h-screen pb-28 safe-top lg:pb-8 lg:px-6 xl:px-8 2xl:max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
