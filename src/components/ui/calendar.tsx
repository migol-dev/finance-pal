import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center text-foreground",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 opacity-100 text-foreground border-border hover:bg-accent hover:text-accent-foreground",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          // Range continuity: middle cells get full primary tint with no rounded corners
          "[&:has([aria-selected].day-range-middle)]:bg-primary/15",
          "[&:has([aria-selected].day-range-start)]:bg-primary/15 [&:has([aria-selected].day-range-start)]:rounded-l-md",
          "[&:has([aria-selected].day-range-end)]:bg-primary/15 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/20",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-foreground/80 hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
        ),
        day_range_end: "day-range-end",
        day_range_start: "day-range-start",
        day_selected:
          "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        day_today: "bg-accent/30 text-foreground font-bold ring-1 ring-accent/60 rounded-md",
        day_outside:
          "day-outside text-muted-foreground/70 opacity-60 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-40",
        day_disabled: "text-muted-foreground opacity-40",
        day_range_middle:
          "aria-selected:bg-primary/20 aria-selected:text-foreground aria-selected:rounded-none hover:aria-selected:bg-primary/30",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
