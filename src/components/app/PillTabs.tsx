import { cn } from "@/lib/utils";

/** Shared pill-tab styles used across goal cards & future sections.
 *  Keeping these as exported constants so visual regressions are easy to spot. */
export const PILL_TABS_CONTAINER =
  "w-full flex gap-1.5 rounded-2xl bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-white/10 p-1.5 text-xs font-semibold";

export const PILL_TAB_BASE =
  "flex-1 min-h-[38px] px-3.5 py-2 rounded-xl transition text-center select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export const PILL_TAB_ACTIVE =
  "bg-white dark:bg-[#1C1C1A] text-[#191918] dark:text-[#EDEDED] border border-[#E4E0D8] dark:border-white/15 shadow-xs font-bold";
export const PILL_TAB_INACTIVE =
  "text-[#6E6A63] dark:text-[#A09E97] hover:text-[#191918] dark:hover:text-[#EDEDED] hover:bg-white/50 dark:hover:bg-white/[0.03] border border-transparent";

export interface PillTabsProps<T extends string> {
  tabs: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
  labels?: Partial<Record<T, string>>;
}

export function PillTabs<T extends string>({ tabs, value, onChange, className, ariaLabel, labels }: PillTabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn(PILL_TABS_CONTAINER, className)}>
      {tabs.map((t) => {
        const active = value === t;
        const displayLabel = labels?.[t] ?? t;
        return (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t)}
            className={cn(PILL_TAB_BASE, active ? PILL_TAB_ACTIVE : PILL_TAB_INACTIVE)}
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
}
