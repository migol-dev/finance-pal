import { ReactNode, useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { useFinance } from "@/store/finance-store";

export function AppShell({ children }: { children: ReactNode }) {
  const seed = useFinance((s) => s.seed);
  const initialized = useFinance((s) => s.initialized);
  useEffect(() => { if (!initialized) seed(); }, [initialized, seed]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen pb-28 safe-top relative">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
