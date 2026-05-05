import { motion } from "framer-motion";
import appIcon from "@/assets/app-icon.png";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background gradient-mesh">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-28 rounded-3xl bg-primary/30 animate-pulse-ring" />
        <span className="absolute size-28 rounded-3xl bg-primary/20 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
        <motion.img
          src={appIcon}
          alt="Finance Pal"
          width={88}
          height={88}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="size-22 w-22 h-22 rounded-3xl shadow-glow relative z-10"
          style={{ width: 88, height: 88 }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <p className="text-xl font-extrabold tracking-tight">Finance Pal</p>
        <div className="mt-3 flex items-center justify-center gap-1.5">
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