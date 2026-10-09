import { useState, memo } from "react";
import { useFinance } from "@/store/finance-store";
import { MONTHS } from "@/lib/finance";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const MonthSwitcher = memo(function MonthSwitcher({ compact = false }: { compact?: boolean }) {
  const { activeYear, activeMonth, setActive, resetToToday } = useFinance();
  const [open, setOpen] = useState(false);

  const prev = () => {
    const m = activeMonth - 1;
    if (m < 0) setActive(activeYear - 1, 11); else setActive(activeYear, m);
  };
  const next = () => {
    const m = activeMonth + 1;
    if (m > 11) setActive(activeYear + 1, 0); else setActive(activeYear, m);
  };

  return (
    <>
      <div className={`inline-flex items-center gap-1 rounded-full bg-card border border-border ${compact ? "px-1 py-0.5" : "px-1.5 py-1"} shadow-soft`}>
        <button onClick={prev} className="size-9 rounded-full hover:bg-muted flex items-center justify-center transition active:scale-95" aria-label="Mes anterior">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={() => setOpen(true)} className="px-3 h-9 rounded-full hover:bg-muted text-xs font-bold flex items-center gap-1.5 transition">
          <CalIcon className="size-3.5 text-primary" />
          <span>{MONTHS[activeMonth]} {activeYear}</span>
        </button>
        <button onClick={next} className="size-9 rounded-full hover:bg-muted flex items-center justify-center transition active:scale-95" aria-label="Mes siguiente">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl w-[calc(100%-1.5rem)] max-w-xs p-5">
          <DialogHeader><DialogTitle>Selecciona un periodo</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Selector de mes y año</DialogDescription>
          <div className="flex items-center justify-between mb-2">
            <button aria-label="Año anterior" onClick={() => setActive(activeYear - 1, activeMonth)} className="size-10 rounded-xl bg-muted hover:bg-primary/10 transition flex items-center justify-center"><ChevronLeft className="size-4" /></button>
            <p className="text-2xl font-extrabold">{activeYear}</p>
            <button aria-label="Año siguiente" onClick={() => setActive(activeYear + 1, activeMonth)} className="size-10 rounded-xl bg-muted hover:bg-primary/10 transition flex items-center justify-center"><ChevronRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => { setActive(activeYear, i); setOpen(false); }}
                className={`h-11 rounded-2xl text-sm font-bold transition ${i === activeMonth ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          <button onClick={() => { resetToToday(); setOpen(false); }} className="mt-2 text-xs font-semibold text-primary underline min-h-[36px] flex items-center">Ir al mes actual</button>
        </DialogContent>
      </Dialog>
    </>
  );
  });
