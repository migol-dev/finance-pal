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
import { ACCENT_PALETTES, AccentColor } from "@/lib/accent-palette";

function applyAccentVars(root: HTMLElement, color: AccentColor) {
  const theme = root.classList.contains("dark") ? "dark" : "light";
  const p = ACCENT_PALETTES[theme][color];
  root.style.setProperty("--accent-hue", String(p.hue));
  root.style.setProperty("--accent-saturation", p.saturation);
  root.style.setProperty("--accent-lightness", p.lightness);
  root.style.setProperty("--primary", p.primary);
  root.style.setProperty("--ring", p.ring);
  root.style.setProperty("--primary-muted", p.primaryMuted);
  root.style.setProperty("--primary-glow", p.primaryGlow);
  root.style.setProperty("--secondary", p.secondary);
  root.style.setProperty("--secondary-muted", p.secondaryMuted);
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-muted", p.accentMuted);
  root.style.setProperty("--success", p.success);
  root.style.setProperty("--success-muted", p.successMuted);
  root.style.setProperty("--warning", p.warning);
  root.style.setProperty("--warning-muted", p.warningMuted);
  root.style.setProperty("--destructive", p.destructive);
  root.style.setProperty("--destructive-muted", p.destructiveMuted);
  root.style.setProperty("--g-primary", p.gradients.primary);
  root.style.setProperty("--g-success", p.gradients.success);
  root.style.setProperty("--g-warning", p.gradients.warning);
  root.style.setProperty("--g-destructive", p.gradients.destructive);
  root.style.setProperty("--g-secondary", p.gradients.secondary);
  root.style.setProperty("--g-sunset", p.gradients.sunset);
  root.style.setProperty("--g-ocean", p.gradients.ocean);
}

const SWIPE_ROUTES = ["/", "/movimientos", "/deudas", "/metas", "/ajustes"];

export function AppShell({ children }: { children: ReactNode }) {
  const setActive = useFinance((s) => s.setActive);
  const theme = useFinance((s) => s.theme);
  const accentColor = useFinance((s) => s.appSettings.accentColor);
  const compactMode = useFinance((s) => s.appSettings.compactMode);
  const glassEffect = useFinance((s) => s.appSettings.glassEffect);
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
    applyAccentVars(root, accentColor);
  }, [theme, accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    root.className.split(" ").filter(c => c.startsWith("accent-")).forEach(c => root.classList.remove(c));
    root.classList.add(`accent-${accentColor}`);
    applyAccentVars(root, accentColor);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    if (compactMode) root.classList.add("compact"); else root.classList.remove("compact");
  }, [compactMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (!glassEffect) root.classList.add("disable-glass"); else root.classList.remove("disable-glass");
  }, [glassEffect]);

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
          <div className="mx-auto w-full min-h-screen pb-32 safe-top lg:pb-8 lg:px-6 xl:px-8 2xl:max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
