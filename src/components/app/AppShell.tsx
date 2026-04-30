import { ReactNode, useEffect, useRef, useState } from "react";
import { BottomNav } from "./BottomNav";
import { useFinance } from "@/store/finance-store";
import { SplashScreen } from "./SplashScreen";

export function AppShell({ children }: { children: ReactNode }) {
  const setActive = useFinance((s) => s.setActive);
  const theme = useFinance((s) => s.theme);
  const didInit = useRef(false);
  const [booting, setBooting] = useState(true);

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

  return (
    <div className="min-h-screen bg-background">
      {booting && <SplashScreen />}
      <div className="mx-auto max-w-md min-h-screen pb-28 safe-top relative">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
