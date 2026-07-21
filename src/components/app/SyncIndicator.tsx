import { motion, AnimatePresence } from "@/lib/framer";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useSyncStore } from "@/store/sync-store";
import { isSupabaseEnabled } from "@/lib/supabase";

type SyncState = "synced" | "syncing" | "pending" | "offline";

const stateMeta: Record<SyncState, { icon: "cloud" | "offline" | "spinner"; color: string; bg: string; label: string }> = {
  synced: { icon: "cloud", color: "text-green-500", bg: "bg-green-500/10", label: "Sincronizado" },
  syncing: { icon: "spinner", color: "text-blue-500", bg: "bg-blue-500/10", label: "Sincronizando..." },
  pending: { icon: "cloud", color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pendiente" },
  offline: { icon: "offline", color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Sin conexión" },
};

function UploadDots({ colorClass }: { colorClass: string }) {
  const bgClass = colorClass.replace("text-", "bg-");
  return (
    <div className="absolute -bottom-2.5 flex items-center gap-[2px]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-[2.5px] rounded-full ${bgClass}`}
          animate={{ height: ["3px", "7px", "3px"], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function SyncIcon({ state, color, queueLen }: { state: SyncState; color: string; queueLen: number }) {
  return (
    <div className="relative size-4 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {state === "offline" && (
          <motion.div key="offline" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.25 }}>
            <CloudOff className={`size-3.5 ${color}`} />
          </motion.div>
        )}
        {state === "syncing" && (
          <motion.div key="syncing" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.25 }} className="flex items-center">
            <RefreshCw className={`size-3.5 ${color} animate-spin`} />
          </motion.div>
        )}
        {state === "pending" && (
          <motion.div key="pending" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.25 }} className="relative">
            <Cloud className={`size-3.5 ${color}`} />
            <motion.div
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              {queueLen}
            </motion.div>
          </motion.div>
        )}
        {state === "synced" && (
          <motion.div key="synced" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.25 }}>
            <Cloud className={`size-3.5 ${color}`} />
          </motion.div>
        )}
      </AnimatePresence>
      {state === "syncing" && <UploadDots colorClass={color} />}
    </div>
  );
}

export function SyncIndicator({ showLabel = true, compact = false, className = "" }: { showLabel?: boolean; compact?: boolean; className?: string }) {
  const { isOnline } = useNetwork();
  const syncQueue = useSyncStore((s) => s.syncQueue);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const state: SyncState = !isOnline ? "offline" : isSyncing ? "syncing" : syncQueue.length > 0 ? "pending" : "synced";
  const meta = stateMeta[state];

  return (
    <motion.div
      layout
      className={`rounded-2xl flex items-center gap-2 text-xs ${compact ? "p-1.5" : "p-2"} ${meta.bg} ${meta.color} ${className}`}
    >
      <SyncIcon state={state} color={meta.color} queueLen={syncQueue.length} />
      {showLabel && (
        <AnimatePresence mode="wait">
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {meta.label}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
