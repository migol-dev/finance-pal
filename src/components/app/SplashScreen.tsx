import { motion } from "@/lib/framer";
import { Wallet } from "lucide-react";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-32 rounded-[32px] bg-primary/20 animate-pulse-ring" />
        <span className="absolute size-32 rounded-[32px] bg-primary/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="size-24 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center relative z-10"
        >
          <Wallet className="size-12 text-primary-foreground" />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <p className="text-xl font-extrabold tracking-tight">Finance Pal</p>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 rounded-full bg-primary"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
