import { ReactNode, memo } from "react";
import { useFinance } from "@/store/finance-store";
import { IconDisplay } from "./IconDisplay";
import { motion } from "@/lib/framer";

export const Header = memo(function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const profile = useFinance((s) => s.profile);
  const greet = profile.name ? `Hola, ${profile.name.split(" ")[0]} 👋` : null;
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-6 pb-4 flex items-end justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        {profile.avatar && <IconDisplay icon={profile.avatar} size="md" />}
        <div className="min-w-0">
          {greet && <p className="text-[11px] text-muted-foreground">{greet}</p>}
          <h1 className="text-3xl font-extrabold tracking-tight text-balance truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.header>
  );
});
