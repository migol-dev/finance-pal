import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import { NotificationPermissionPrompt } from "./NotificationPermissionPrompt";
import { SplashScreen } from "./SplashScreen";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { toast } from "sonner";
import { ACCENT_PALETTES, AccentColor } from "@/lib/accent-palette";
import { isSupabaseEnabled } from "@/lib/supabase";

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
  const { setActive, appSettings, goals, fixedItems } = useFinanceData();
  const { resolvedTheme } = useSystemTheme();
  const accentColor = appSettings.accentColor;
  const compactMode = appSettings.compactMode;
  const glassEffect = appSettings.glassEffect;
  const a11y = appSettings.accessibility;

  // Activar motor reactivo autónomo de notificaciones
  useNotificationScheduler();

  const didInit = useRef(false);
  const [booting, setBooting] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastBackPressRef = useRef<number | null>(null);

  useEffect(() => {
    // Only handle the boot screen timeout here, completely decoupled from data dependencies
    const t = setTimeout(() => setBooting(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    if (goals.length > 0 || fixedItems.length > 0 || !isSupabaseEnabled) {
      didInit.current = true;
      const d = new Date();
      setActive(d.getFullYear(), d.getMonth());
    }
  }, [setActive, goals.length, fixedItems.length]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? "#0a0e1a" : "#ffffff");
    applyAccentVars(root, accentColor);
  }, [resolvedTheme, accentColor]);

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
    const root = document.documentElement;
    if (!a11y) return;

    // Dynamic text scale
    const percent = a11y.textScalePercent ?? (
      a11y.textScale === "compact" ? 85 :
      a11y.textScale === "large" ? 115 :
      a11y.textScale === "xlarge" ? 135 : 100
    );
    root.style.fontSize = `${(percent / 100) * 16}px`;
    root.classList.remove("a11y-scale-compact", "a11y-scale-large", "a11y-scale-xlarge");
    if (a11y.textScale === "compact") root.classList.add("a11y-scale-compact");
    else if (a11y.textScale === "large") root.classList.add("a11y-scale-large");
    else if (a11y.textScale === "xlarge") root.classList.add("a11y-scale-xlarge");

    // Toggles
    if (a11y.highContrast) root.classList.add("a11y-high-contrast");
    else root.classList.remove("a11y-high-contrast");

    if (a11y.reduceMotion) root.classList.add("a11y-reduce-motion");
    else root.classList.remove("a11y-reduce-motion");

    if (a11y.dyslexicFont) root.classList.add("a11y-dyslexic-font");
    else root.classList.remove("a11y-dyslexic-font");

    if (a11y.underlineLinks) root.classList.add("a11y-underline-links");
    else root.classList.remove("a11y-underline-links");

    if (a11y.largeTouchTargets) root.classList.add("a11y-large-targets");
    else root.classList.remove("a11y-large-targets");

    if (a11y.enhancedFocusRing) root.classList.add("a11y-enhanced-focus");
    else root.classList.remove("a11y-enhanced-focus");

    // Colorblind
    root.classList.remove("a11y-cb-protanopia", "a11y-cb-deuteranopia", "a11y-cb-tritanopia");
    if (a11y.colorBlindMode && a11y.colorBlindMode !== "none") {
      root.classList.add(`a11y-cb-${a11y.colorBlindMode}`);
    }
  }, [a11y]);

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
        try { CapacitorApp.exitApp(); } catch { (navigator as any)['app']?.exitApp?.(); }
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
      <NotificationPermissionPrompt />
      <BottomNav />
    </div>
  );
}
