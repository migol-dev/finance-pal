import { ReactNode, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { useFinance } from "@/store/finance-store";
import { IconDisplay } from "./IconDisplay";
import { motion } from "@/lib/framer";
import { isSupabaseEnabled } from "@/lib/supabase";
import { SyncIndicator } from "./SyncIndicator";

export const Header = memo(function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  const profile = useFinance((s) => s.profile);
  const location = useLocation();
  const greet = profile.name ? `Hola, ${profile.name.split(" ")[0]}` : null;
  const isAjustesPage = location.pathname === "/ajustes";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 flex items-start justify-between gap-2.5 sm:gap-3"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {profile.avatar && <IconDisplay icon={profile.avatar} size="sm" />}
        <div className="min-w-0 flex-1">
          {greet && <p className="text-xs text-muted-foreground font-medium truncate">{greet}</p>}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight truncate min-w-0">{title}</h1>
            {isSupabaseEnabled && <SyncIndicator compact />}
          </div>
          {subtitle && <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
        {action}
        {!isAjustesPage && (
          <Link
            to="/ajustes"
            aria-label="Ir a Ajustes y Perfil"
            title="Ajustes y Perfil"
            className="lg:hidden size-11 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-card hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95 shrink-0"
          >
            {profile.avatar ? (
              <IconDisplay icon={profile.avatar} size="xs" className="size-4 shrink-0" />
            ) : (
              <Settings className="size-4" strokeWidth={1.5} />
            )}
          </Link>
        )}
      </div>
    </motion.header>
  );
});
