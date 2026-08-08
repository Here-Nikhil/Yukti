import { motion } from "framer-motion";
import { useState } from "react";
import { ModeToggle } from "./ModeToggle";
import type { UserMode } from "@/lib/user-mode";

const FAINT_LINES = [
  "def average(nums): return sum(nums) / len(nums)",
  "const total = items.reduce((a, b) => a + b.price, 0)",
  "if (!user) navigate({ to: '/login' })",
  "git apply --3way patch.diff",
  "export function parse(output: string) {}",
  "for (const file of files) index(file)",
];

/** Full-screen split mode selection shown once per brand-new workspace. */
export function ModeSplash({ onSelect }: { onSelect: (m: UserMode) => void }) {
  const [hover, setHover] = useState<UserMode | null>(null);
  const [value, setValue] = useState<UserMode>("manual");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex bg-[#0d0b14]"
    >
      {/* Manual half */}
      <button
        type="button"
        onMouseEnter={() => setHover("manual")}
        onMouseLeave={() => setHover(null)}
        onClick={() => onSelect("manual")}
        className="relative flex-1 overflow-hidden border-r border-[#2a2440] text-left"
        style={{
          background: hover === "manual" ? "#1a1625" : "#0d0b14",
          transition: "background 300ms",
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30">
          {FAINT_LINES.map((l, i) => (
            <motion.div
              key={i}
              initial={{ y: 40 + i * 90, opacity: 0 }}
              animate={{ y: [40 + i * 90, -60 + i * 90], opacity: [0, 0.6, 0] }}
              transition={{ duration: 14 + i * 2, repeat: Infinity, ease: "linear", delay: i * 1.4 }}
              className="whitespace-pre px-10 font-mono text-[12px] text-[#8b87a0]"
            >
              {l}
            </motion.div>
          ))}
        </div>
        <div className="relative flex h-full flex-col justify-center px-16">
          <div className="text-4xl font-semibold text-[#f1f0f5]">Manual</div>
          <p className="mt-3 max-w-sm text-sm text-[#8b87a0]">
            Paste LLM output yourself — Yukti parses it and applies the diff.
          </p>
        </div>
      </button>

      {/* Auto half */}
      <button
        type="button"
        onMouseEnter={() => setHover("auto")}
        onMouseLeave={() => setHover(null)}
        onClick={() => onSelect("auto")}
        className="relative flex-1 overflow-hidden text-left"
        style={{
          background: hover === "auto" ? "rgba(139,92,246,0.10)" : "#0d0b14",
          transition: "background 300ms",
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.1, 0.65, 0.1], scale: [0.8, 1.35, 0.8] }}
              transition={{
                duration: 3.2 + (i % 5),
                repeat: Infinity,
                delay: (i % 7) * 0.4,
                ease: "easeInOut",
              }}
              className="absolute rounded-full bg-[#8b5cf6]"
              style={{
                width: 6 + (i % 4) * 3,
                height: 6 + (i % 4) * 3,
                left: `${(i * 37) % 92}%`,
                top: `${(i * 53) % 90}%`,
                boxShadow: "0 0 18px #8b5cf6",
              }}
            />
          ))}
        </div>
        <div className="relative flex h-full flex-col items-end justify-center px-16 text-right">
          <div className="text-4xl font-semibold text-[#c4b5fd]">Auto</div>
          <p className="mt-3 max-w-sm text-sm text-[#8b87a0]">
            Chat with Yukti — it reads your files and writes the changes for you.
          </p>
        </div>
      </button>

      {/* Center toggle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 22 }}
          className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl border border-[#2a2440] bg-[#1a1625]/90 px-8 py-6 backdrop-blur"
        >
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8b87a0]">
            Choose a mode
          </div>
          <ModeToggle
            value={value}
            size="lg"
            onChange={(m) => {
              setValue(m);
              onSelect(m);
            }}
          />
          <div className="text-[11px] text-[#8b87a0]">You can switch anytime</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
