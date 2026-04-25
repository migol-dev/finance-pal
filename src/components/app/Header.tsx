import { ReactNode } from "react";

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="px-5 pt-6 pb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
