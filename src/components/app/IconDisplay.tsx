import { IconRef } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function IconDisplay({ icon, className, size = "md" }: { icon: IconRef; className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = { sm: "size-9 text-base", md: "size-11 text-xl", lg: "size-14 text-2xl", xl: "size-20 text-4xl" };
  if (icon.kind === "image") {
    return (
      <div className={cn("rounded-2xl overflow-hidden bg-muted shrink-0", sizeMap[size], className)}>
        <img src={icon.value} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={cn("rounded-2xl bg-muted flex items-center justify-center shrink-0", sizeMap[size], className)}>
      <span>{icon.value}</span>
    </div>
  );
}
