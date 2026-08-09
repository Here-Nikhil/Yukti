import { useState, type CSSProperties } from "react";
import { Settings, Hammer, Wrench, Code2, Brain, BarChart3, Check } from "lucide-react";
import { motion } from "framer-motion";
import { ModeToggle } from "./ModeToggle";
import type { UserMode } from "@/lib/user-mode";

interface ModeSplashProps {
  onSelect: (mode: UserMode) => void;
}

const PURPLE = "#8b5cf6";
const CYAN = "#22d3ee";

const overlay: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };

const manualIcons = [
  { Icon: Settings, size: 36, top: "12%", left: "8%", duration: "8s", delay: "0s" },
  { Icon: Hammer, size: 28, top: "22%", left: "38%", duration: "7s", delay: "1.4s" },
  { Icon: Wrench, size: 24, top: "8%", left: "55%", duration: "6.5s", delay: "2.6s" },
  { Icon: Settings, size: 20, top: "18%", left: "72%", duration: "9s", delay: "0.8s" },
];

const particles = [
  { left: "62%", top: "70%", duration: "6s", delay: "0s" },
  { left: "74%", top: "82%", duration: "7.5s", delay: "0.8s" },
  { left: "40%", top: "64%", duration: "9s", delay: "1.6s" },
  { left: "88%", top: "74%", duration: "5.5s", delay: "2.2s" },
  { left: "30%", top: "88%", duration: "8s", delay: "3s" },
  { left: "55%", top: "92%", duration: "6.5s", delay: "3.8s" },
  { left: "80%", top: "58%", duration: "7s", delay: "4.4s" },
  { left: "20%", top: "72%", duration: "8.5s", delay: "5s" },
];

const checklist = [
  "Reading files",
  "Understanding context",
  "Generating changes",
  "Applying updates",
];

export function ModeSplash({ onSelect }: ModeSplashProps) {
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null);

  const sideFilter = (side: UserMode) => {
    if (!selectedMode) return "brightness(1)";
    return selectedMode === side ? "brightness(1.1)" : "brightness(0.72) saturate(0.75)";
  };

  const holoCard: CSSProperties = {
    background: "rgba(6, 20, 50, 0.6)",
    border: "1px solid rgba(34, 211, 238, 0.25)",
    backdropFilter: "blur(8px)",
    borderRadius: 12,
    fontSize: "0.75rem",
    color: CYAN,
    padding: "0.75rem 0.9rem",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: "#0d0b14",
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* ================= MANUAL ================= */}
      <div
        className="relative overflow-hidden"
        style={{
          flex: 1,
          backgroundImage: "url('/manual-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "70% 30%",
          filter: sideFilter("manual"),
          transition: "filter 600ms ease",
          animation: "ms-slow-drift 20s ease-in-out infinite",
        }}
      >
        <div style={{ ...overlay, background: "rgba(10, 6, 20, 0.25)" }} />
        <div
          style={{
            ...overlay,
            background:
              "radial-gradient(ellipse 55% 45% at 55% 65%, rgba(139, 92, 246, 0.25), transparent)",
            animation: "ms-pulse-purple 4s ease-in-out infinite",
            opacity: selectedMode === "manual" ? 0.7 : selectedMode === "auto" ? 0.15 : 1,
            transition: "opacity 600ms ease",
          }}
        />
        <div
          style={{
            ...overlay,
            background:
              "linear-gradient(to top, rgba(10, 6, 20, 0.97) 0%, rgba(10, 6, 20, 0.5) 20%, transparent 50%)",
          }}
        />
        <div
          style={{
            ...overlay,
            background: "linear-gradient(to right, rgba(10, 6, 20, 0.6), transparent 35%)",
          }}
        />
        <div
          style={{
            ...overlay,
            background: "linear-gradient(to bottom, rgba(10, 6, 20, 0.55), transparent 30%)",
          }}
        />

        {manualIcons.map(({ Icon, size, top, left, duration, delay }, i) => (
          <Icon
            key={i}
            size={size}
            color="#ffffff"
            style={{
              position: "absolute",
              top,
              left,
              opacity: 0.1,
              zIndex: 5,
              animation: `ms-float ${duration} ease-in-out ${delay} infinite`,
            }}
          />
        ))}

        {/* Text — true vertical center */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            transform: "translateY(-50%)",
            zIndex: 10,
            padding: "0 2.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            maxWidth: 420,
          }}
        >
          <h2
            style={{
              fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1,
              margin: 0,
              textShadow:
                "0 0 40px rgba(0,0,0,1), 0 2px 8px rgba(0,0,0,1), 0 0 80px rgba(139,92,246,0.3)",
            }}
          >
            Manual
          </h2>
          <p
            style={{
              fontSize: "1rem",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.88)",
              margin: 0,
              lineHeight: 1.5,
              textShadow: "0 1px 12px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.9)",
            }}
          >
            &ldquo;The best tools amplify human skill &mdash; they don&rsquo;t replace the
            craftsman.&rdquo;
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
              lineHeight: 1.6,
              textShadow: "0 1px 8px rgba(0,0,0,1)",
            }}
          >
            Paste LLM output yourself. Yukti parses it, finds the right files, and applies the diff
            precisely.
          </p>
        </div>
      </div>

      {/* ================= DIVIDER ================= */}
      <div
        style={{
          width: 1,
          flexShrink: 0,
          background:
            "linear-gradient(to bottom, transparent, rgba(139, 92, 246, 0.5) 30%, rgba(34, 211, 238, 0.5) 70%, transparent)",
        }}
      />

      {/* ================= AUTO ================= */}
      <div
        className="relative overflow-hidden"
        style={{
          flex: 1,
          backgroundImage: "url('/auto-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "30% 40%",
          filter: sideFilter("auto"),
          transition: "filter 600ms ease",
        }}
      >
        <div style={{ ...overlay, background: "rgba(6, 10, 25, 0.25)" }} />
        <div
          style={{
            ...overlay,
            background:
              "radial-gradient(ellipse 55% 45% at 45% 60%, rgba(34, 211, 238, 0.22), transparent)",
            animation: "ms-pulse-cyan 4s ease-in-out infinite",
            opacity: selectedMode === "auto" ? 0.65 : selectedMode === "manual" ? 0.12 : 1,
            transition: "opacity 600ms ease",
          }}
        />
        <div
          style={{
            ...overlay,
            background:
              "linear-gradient(to top, rgba(6, 10, 25, 0.97) 0%, rgba(6, 10, 25, 0.5) 20%, transparent 50%)",
          }}
        />
        <div
          style={{
            ...overlay,
            background: "linear-gradient(to left, rgba(6, 10, 25, 0.6), transparent 35%)",
          }}
        />
        <div
          style={{
            ...overlay,
            background: "linear-gradient(to bottom, rgba(6, 10, 25, 0.55), transparent 30%)",
          }}
        />

        {/* Holographic cards — staggered fade in, always visible one at a time */}
        <div
          style={{
            position: "absolute",
            right: 32,
            top: 32,
            zIndex: 10,
            width: 220,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            pointerEvents: "none",
          }}
        >
          <motion.div
            style={holoCard}
            animate={{ opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 4, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 8, delay: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Code2 size={14} />
              <span style={{ letterSpacing: "0.08em" }}>YUKTI</span>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {checklist.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={11} color={CYAN} />
                  <span style={{ color: "rgba(226, 250, 255, 0.8)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            style={{ ...holoCard, boxShadow: "0 0 24px rgba(34, 211, 238, 0.18)", display: "flex", alignItems: "center", gap: 8 }}
            animate={{ opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 4, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 8, delay: 4 }}
          >
            <Brain size={16} />
            <span>Reasoning about your codebase</span>
          </motion.div>

          <motion.div
            style={{ ...holoCard, display: "flex", alignItems: "center", gap: 8 }}
            animate={{ opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 4, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 8, delay: 8 }}
          >
            <BarChart3 size={16} />
            <span>Changes applied successfully</span>
          </motion.div>
        </div>

        {/* Cyan particles */}
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: p.left,
              top: p.top,
              width: 2,
              height: 2,
              borderRadius: "50%",
              background: CYAN,
              opacity: 0.4,
              animation: `ms-particle-float ${p.duration} linear ${p.delay} infinite`,
            }}
          />
        ))}

        {/* Text — true vertical center */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 0,
            transform: "translateY(-50%)",
            zIndex: 10,
            padding: "0 2.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.75rem",
            textAlign: "right",
            maxWidth: 420,
          }}
        >
          <h2
            style={{
              fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)",
              fontWeight: 700,
              color: CYAN,
              lineHeight: 1,
              margin: 0,
              textShadow:
                "0 0 40px rgba(0,0,0,1), 0 2px 8px rgba(0,0,0,1), 0 0 80px rgba(34,211,238,0.4)",
            }}
          >
            Auto
          </h2>
          <p
            style={{
              fontSize: "1rem",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.88)",
              margin: 0,
              lineHeight: 1.5,
              textShadow: "0 1px 12px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.9)",
            }}
          >
            &ldquo;AI won&rsquo;t take your job &mdash; but someone using AI will.&rdquo;
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
              lineHeight: 1.6,
              textShadow: "0 1px 8px rgba(0,0,0,1)",
            }}
          >
            Chat with Yukti. It reads your files, understands the context, and writes the changes for
            you.
          </p>
        </div>
      </div>

      {/* ================= CENTER CARD ================= */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 22 }}
          style={{
            background: "rgba(13, 11, 20, 0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(139, 92, 246, 0.35)",
            borderRadius: 20,
            padding: "2rem 2.5rem",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(139, 92, 246, 0.2), 0 0 80px rgba(34, 211, 238, 0.1)",
            minWidth: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            color: "#f1f0f5",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.24em",
              color: "rgba(241, 240, 245, 0.45)",
              fontWeight: 600,
            }}
          >
            CHOOSE A MODE
          </span>

          <ModeToggle value={selectedMode} onChange={setSelectedMode} size="lg" />

          <span style={{ fontSize: "0.72rem", color: "rgba(241, 240, 245, 0.35)" }}>
            You can switch anytime
          </span>

          {selectedMode && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              type="button"
              onClick={() => onSelect(selectedMode)}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: "0.65rem 1.5rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#0d0b14",
                background: selectedMode === "manual" ? PURPLE : CYAN,
                boxShadow:
                  selectedMode === "manual"
                    ? "0 0 24px rgba(139, 92, 246, 0.4)"
                    : "0 0 24px rgba(34, 211, 238, 0.35)",
                border: "none",
                cursor: "pointer",
                transition: "background 300ms ease, box-shadow 300ms ease",
              }}
            >
              Continue with {selectedMode === "manual" ? "Manual" : "Auto"}
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ModeSplash;