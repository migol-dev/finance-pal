import { ReactNode, memo } from "react";
import { useFinance } from "@/store/finance-store";
import { IconDisplay } from "./IconDisplay";
import { motion } from "@/lib/framer";
import { isSupabaseEnabled } from "@/lib/supabase";
import { SyncIndicator } from "./SyncIndicator";

export const Header = memo(function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const profile = useFinance((s) => s.profile);
  const greet = profile.name ? `Hola, ${profile.name.split(" ")[0]}` : null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 lg:px-6 pt-5 pb-4 flex items-start justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {profile.avatar && <IconDisplay icon={profile.avatar} size="sm" />}
        <div className="min-w-0 flex-1">
          {greet && <p className="text-xs text-muted-foreground font-medium">{greet}</p>}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-balance">{title}</h1>
            {isSupabaseEnabled && <SyncIndicator compact />}
          </div>
          {subtitle && <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.header>
  );
});
