import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogDescription } from "@/components/ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

type CommandDialogProps = DialogProps;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent
        hideCloseButton
        className="overflow-hidden p-0 sm:max-w-[520px] rounded-2xl border border-[#E4E0D8] dark:border-white/10 dark:border-t-white/15 bg-popover/98 backdrop-blur-xl shadow-2xl gap-0"
      >
        <DialogDescription className="sr-only">Caja de comandos</DialogDescription>
        <Command className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/80 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-1 [&_[cmdk-group]]:px-1.5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="flex items-center gap-3 border-b border-[#E4E0D8]/80 dark:border-white/[0.08] bg-muted/25 dark:bg-white/[0.02] px-4 h-[52px]"
    cmdk-input-wrapper=""
  >
    <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-9 w-full flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground/65 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
    <DialogClose
      aria-label="Cerrar"
      className="btn-fixed-size inline-flex items-center gap-1 h-6 px-2 rounded-md border border-[#E4E0D8] dark:border-white/10 bg-background/80 dark:bg-white/[0.05] text-[10px] font-mono-tabular font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
    >
      <span>ESC</span>
      <X className="size-3" strokeWidth={1.75} />
    </DialogClose>
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[360px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />);

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/80",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("mx-2 my-1.5 h-px bg-[#E4E0D8]/80 dark:bg-white/[0.08]", className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium text-foreground/90 outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-primary/[0.11] dark:data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-foreground data-[disabled=true]:opacity-50",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center justify-center h-5 min-w-[1.5rem] px-1.5 rounded-md border border-[#E4E0D8]/90 dark:border-white/10 bg-background/80 dark:bg-white/[0.05] font-mono-tabular text-[10px] font-medium tracking-normal text-muted-foreground leading-none shrink-0",
        className,
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
