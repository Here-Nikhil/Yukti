import { motion, AnimatePresence } from "framer-motion";
import { Check, Upload } from "lucide-react";

export type ZipStep = {
  label: string;
  emoji: string;
  status: "pending" | "running" | "done";
};

export function ZipUploadOverlay({
  visible,
  dropActive,
  filename,
  steps,
}: {
  visible: boolean;
  dropActive: boolean;
  filename?: string | null;
  steps: ZipStep[];
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: "blur(6px)" }}
        >
          <div className="absolute inset-0 bg-background/80" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-primary/60 px-12 py-12 text-center"
          >
            {!filename ? (
              <>
                <motion.div
                  animate={dropActive ? { scale: [1, 1.08, 1] } : { scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/20 text-primary"
                >
                  <Upload className="h-9 w-9" />
                </motion.div>
                <div className="text-2xl font-semibold">Drop your project here</div>
                <div className="text-sm text-muted-foreground">
                  Accepts a .zip archive. Yukti unpacks and indexes it.
                </div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0.6, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400"
                >
                  <Check className="h-7 w-7" />
                </motion.div>
                <div className="text-lg font-semibold break-all">{filename}</div>
                <div className="w-full space-y-2 text-left">
                  {steps.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-6">{s.emoji}</span>
                      <span
                        className={
                          s.status === "done"
                            ? "text-foreground"
                            : s.status === "running"
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {s.label}
                      </span>
                      <span className="ml-auto">
                        {s.status === "done" ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 14 }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
                          >
                            <Check className="h-3 w-3" />
                          </motion.span>
                        ) : s.status === "running" ? (
                          <span className="inline-block h-2 w-16 overflow-hidden rounded-full bg-border">
                            <motion.span
                              initial={{ x: "-100%" }}
                              animate={{ x: "0%" }}
                              transition={{ duration: 0.8, ease: "easeInOut" }}
                              className="block h-full w-full bg-[#8b5cf6]"
                            />
                          </span>
                        ) : null}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
