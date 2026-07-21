import { ReactNode, memo } from "react";
import { useFinance } from "@/store/finance-store";
import { IconDisplay } from "./IconDisplay";
import { motion } from "@/lib/framer";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useSyncStore } from "@/store/sync-store";
import { isSupabaseEnabled } from "@/lib/supabase";

export const Header = memo(function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const profile = useFinance((s) => s.profile);
  const greet = profile.name ? `Hola, ${profile.name.split(" ")[0]} 👋` : null;
  const { isOnline } = useNetwork();
  const syncQueue = useSyncStore((s) => s.syncQueue);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        {profile.avatar && <IconDisplay icon={profile.avatar} size="md" />}
        <div className="min-w-0">
          {greet && <p className="text-[11px] text-muted-foreground">{greet}</p>}
          <div className="flex items-center gap-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-balance truncate">{title}</h1>
            {isSupabaseEnabled && (
              <div title={isOnline ? (syncQueue.length ? "Hay cambios pendientes de sincronizar" : "Sincronizado") : "Sin conexión"}>
                {!isOnline ? (
                  <CloudOff className="w-5 h-5 text-yellow-500" />
                ) : isSyncing ? (
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                ) : syncQueue.length > 0 ? (
                  <div className="relative">
                    <Cloud className="w-5 h-5 text-yellow-500" />
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center font-bold">
                      {syncQueue.length}
                    </div>
                  </div>
                ) : (
                  <Cloud className="w-5 h-5 text-green-500" />
                )}
              </div>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.header>
  );
});
