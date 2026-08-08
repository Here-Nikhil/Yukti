import { motion } from "framer-motion";
import type { UserMode } from "@/lib/user-mode";

/** Shared Manual/Auto toggle switch (splash screen + workspace top bar). */
export function ModeToggle({
  value,
  onChange,
  size = "sm",
}: {
  value: UserMode;
  onChange: (m: UserMode) => void;
  size?: "sm" | "lg";
}) {
  const auto = value === "auto";
  const dims =
    size === "lg"
      ? { w: 84, h: 44, knob: 34, pad: 5 }
      : { w: 56, h: 28, knob: 22, pad: 3 };

  return (
    <div className="flex items-center gap-2 select-none">
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={`text-[11px] font-semibold uppercase tracking-wide transition-colors ${
          auto ? "text-[#8b87a0]" : "text-[#f1f0f5]"
        }`}
      >
        Manual
      </button>
      <button
        type="button"
        aria-label="Toggle mode"
        onClick={() => onChange(auto ? "manual" : "auto")}
        className="relative rounded-full border transition-colors"
        style={{
          width: dims.w,
          height: dims.h,
          borderColor: auto ? "#8b5cf6" : "#2a2440",
          background: auto ? "rgba(139,92,246,0.18)" : "#0d0b14",
          boxShadow: auto ? "0 0 22px -4px #8b5cf6" : "none",
        }}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="absolute top-0 rounded-full"
          style={{
            width: dims.knob,
            height: dims.knob,
            top: dims.pad,
            left: auto ? dims.w - dims.knob - dims.pad : dims.pad,
            background: auto ? "#8b5cf6" : "#f1f0f5",
            boxShadow: auto ? "0 0 16px #8b5cf6" : "none",
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onChange("auto")}
        className={`text-[11px] font-semibold uppercase tracking-wide transition-colors ${
          auto ? "text-[#c4b5fd]" : "text-[#8b87a0]"
        }`}
      >
        Auto
      </button>
    </div>
  );
}
