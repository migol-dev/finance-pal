import { ReactNode, useEffect, useRef } from "react";
import { BottomNav } from "./BottomNav";
import { useFinance } from "@/store/finance-store";

export function AppShell({ children }: { children: ReactNode }) {
  const setActive = useFinance((s) => s.setActive);
  const didInit = useRef(false);

  // On first mount of the session, snap to the device's current month/year.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const d = new Date();
    setActive(d.getFullYear(), d.getMonth());
  }, [setActive]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen pb-28 safe-top relative">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
