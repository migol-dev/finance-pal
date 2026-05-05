import { cn } from "@/lib/utils";

/** Shared pill-tab styles used across goal cards & future sections.
 *  Keeping these as exported constants so visual regressions are easy to spot. */
export const PILL_TABS_CONTAINER =
  "flex gap-1 rounded-2xl bg-white/15 p-1 text-[11px] font-bold backdrop-blur-sm";

export const PILL_TAB_BASE =
  "flex-1 py-1.5 rounded-xl transition capitalize select-none";

export const PILL_TAB_ACTIVE = "bg-white text-primary-foreground shadow-sm";
export const PILL_TAB_INACTIVE = "text-primary-foreground/90 hover:text-primary-foreground";

export interface PillTabsProps<T extends string> {
  tabs: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function PillTabs<T extends string>({ tabs, value, onChange, className, ariaLabel }: PillTabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn(PILL_TABS_CONTAINER, className)}>
      {tabs.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t)}
            className={cn(PILL_TAB_BASE, active ? PILL_TAB_ACTIVE : PILL_TAB_INACTIVE)}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}