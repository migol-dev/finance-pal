import { motion, AnimatePresence } from "@/lib/framer";
import { Cloud, CloudOff } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useSyncStore } from "@/store/sync-store";
import { Capacitor } from "@capacitor/core";

type SyncState = "synced" | "syncing" | "pending" | "offline";

const isNative = Capacitor.isNativePlatform();

function SyncIcon({ state, queueLen }: { state: SyncState; queueLen: number }) {
  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence mode="wait">
        {state === "offline" && (
          <motion.div key="offline" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.25 }}>
            <div className="relative">
              <Cloud className="size-4 text-gray-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-0.5 bg-gray-400 rotate-[-45deg] origin-center" />
              </div>
            </div>
          </motion.div>
        )}
        {state === "syncing" && (
          <motion.div
            key="syncing"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "center center" }}
            >
              <Cloud className="size-4 text-yellow-500" />
            </motion.div>
          </motion.div>
        )}
        {state === "pending" && (
          <motion.div key="pending" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.25 }} className="relative">
            <Cloud className="size-4 text-yellow-500" />
            <motion.div
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[7px] rounded-full w-3 h-3 flex items-center justify-center font-bold"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              {queueLen}
            </motion.div>
          </motion.div>
        )}
        {state === "synced" && (
          <motion.div key="synced" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.25 }}>
            <Cloud className="size-4 text-gray-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopSyncIcon({ state, color, queueLen }: { state: SyncState; color: string; queueLen: number }) {
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "center center" }}
            >
              <Cloud className={`size-3.5 ${color}`} />
            </motion.div>
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
    </div>
  );
}

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

export function SyncIndicator({ showLabel = true, compact = false, className = "" }: { showLabel?: boolean; compact?: boolean; className?: string }) {
  const { isOnline } = useNetwork();
  const syncQueue = useSyncStore((s) => s.syncQueue);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const state: SyncState = !isOnline ? "offline" : isSyncing ? "syncing" : syncQueue.length > 0 ? "pending" : "synced";

  // Mobile/compact: icon only, no background, no label
  if (compact || isNative) {
    return (
      <div className={`flex items-center ${className}`}>
        <SyncIcon state={state} queueLen={syncQueue.length} />
      </div>
    );
  }

  // Desktop: with label and colored background
  const stateMeta: Record<SyncState, { icon: "cloud" | "offline" | "spinner"; color: string; bg: string; label: string }> = {
    synced: { icon: "cloud", color: "text-green-500", bg: "bg-green-500/10", label: "Sincronizado" },
    syncing: { icon: "spinner", color: "text-blue-500", bg: "bg-blue-500/10", label: "Sincronizando..." },
    pending: { icon: "cloud", color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pendiente" },
    offline: { icon: "offline", color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Sin conexión" },
  };
  const meta = stateMeta[state];

  return (
    <motion.div
      layout
      className={`rounded-2xl flex items-center gap-2 text-xs ${showLabel ? "p-2" : "p-1.5"} ${meta.bg} ${meta.color} ${className}`}
    >
      <DesktopSyncIcon state={state} color={meta.color} queueLen={syncQueue.length} />
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
      {state === "syncing" && <UploadDots colorClass={meta.color} />}
    </motion.div>
  );
}