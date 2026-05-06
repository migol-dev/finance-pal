import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useFinance } from "@/store/finance-store";
import { SplashScreen } from "./SplashScreen";

const SWIPE_ROUTES = ["/", "/movimientos", "/deudas", "/metas", "/ajustes"];

export function AppShell({ children }: { children: ReactNode }) {
  const setActive = useFinance((s) => s.setActive);
  const theme = useFinance((s) => s.theme);
  const didInit = useRef(false);
  const [booting, setBooting] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // On first mount of the session, snap to the device's current month/year.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const d = new Date();
    setActive(d.getFullYear(), d.getMonth());
    const t = setTimeout(() => setBooting(false), 900);
    return () => clearTimeout(t);
  }, [setActive]);

  // Apply theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0B1220" : "#F43F5E");
  }, [theme]);

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
    // Avoid interfering when starting on interactive horizontally-scrollable areas
    const target = e.target as HTMLElement | null;
    if (target?.closest('input,textarea,select,[role="dialog"],.no-swipe')) return;
    const idx = SWIPE_ROUTES.indexOf(location.pathname);
    if (idx === -1) return;
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next < 0 || next >= SWIPE_ROUTES.length) return;
    navigate(SWIPE_ROUTES[next]);
  };

  return (
    <div className="min-h-screen bg-background">
      {booting && <SplashScreen />}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="mx-auto max-w-md min-h-screen pb-28 safe-top relative">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
