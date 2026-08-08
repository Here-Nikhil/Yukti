import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "show" | "snap" | "type" | "done";

const MAX_PARTICLE_CHARS = 1400;

/**
 * "Thanos snap" code transition:
 * shows oldCode → characters break into #8b5cf6 particles drifting upward →
 * newCode types itself in with a blinking cursor.
 */
export function SnapCode({
  oldCode,
  newCode,
  loop = false,
  loopEvery = 7000,
  showFor = 2500,
  typeSpeed = 16,
  onDone,
  className,
}: {
  oldCode: string;
  newCode: string;
  loop?: boolean;
  loopEvery?: number;
  showFor?: number;
  typeSpeed?: number;
  onDone?: () => void;
  className?: string;
}) {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<Phase>("show");
  const [typed, setTyped] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // phase scheduler
  useEffect(() => {
    setPhase("show");
    setTyped(0);
    const t1 = window.setTimeout(() => setPhase("snap"), showFor);
    const t2 = window.setTimeout(() => setPhase("type"), showFor + 850);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cycle, showFor, oldCode, newCode]);

  // typing
  useEffect(() => {
    if (phase !== "type") return;
    const iv = window.setInterval(() => {
      setTyped((n) => {
        if (n >= newCode.length) {
          window.clearInterval(iv);
          setPhase("done");
          return n;
        }
        return n + 1;
      });
    }, typeSpeed);
    return () => window.clearInterval(iv);
  }, [phase, newCode, typeSpeed]);

  // done / loop
  useEffect(() => {
    if (phase !== "done") return;
    doneRef.current?.();
    if (!loop) return;
    const typeMs = newCode.length * typeSpeed;
    const rest = Math.max(1200, loopEvery - showFor - 850 - typeMs);
    const t = window.setTimeout(() => setCycle((c) => c + 1), rest);
    return () => window.clearTimeout(t);
  }, [phase, loop, loopEvery, showFor, typeSpeed, newCode.length]);

  const particleLines = useMemo(() => {
    const clipped = oldCode.slice(0, MAX_PARTICLE_CHARS);
    return clipped.split("\n").map((line) =>
      line.split("").map((ch) => ({
        ch,
        dx: (Math.random() - 0.5) * 26,
        dy: -18 - Math.random() * 46,
        delay: Math.random() * 0.35,
      })),
    );
  }, [oldCode, cycle]);

  const base = `whitespace-pre font-mono text-[12.5px] leading-relaxed ${className ?? ""}`;

  if (phase === "show") {
    return <pre className={`${base} text-[#d6d1e6]`}>{oldCode}</pre>;
  }

  if (phase === "snap") {
    return (
      <pre className={`${base} text-[#d6d1e6]`} aria-hidden>
        {particleLines.map((line, li) => (
          <div key={li}>
            {line.map((p, ci) => (
              <motion.span
                key={ci}
                initial={{ opacity: 1, y: 0, x: 0, scale: 1, color: "#d6d1e6" }}
                animate={{
                  opacity: 0,
                  y: p.dy,
                  x: p.dx,
                  scale: 0.35,
                  color: "#8b5cf6",
                  filter: "blur(1.5px)",
                }}
                transition={{ duration: 0.75, delay: p.delay, ease: "easeOut" }}
                className="inline-block"
              >
                {p.ch === " " ? "\u00A0" : p.ch}
              </motion.span>
            ))}
            {line.length === 0 ? "\u00A0" : null}
          </div>
        ))}
      </pre>
    );
  }

  return (
    <pre className={`${base} text-[#f1f0f5]`}>
      {newCode.slice(0, typed)}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        className="ml-0.5 inline-block h-[1em] w-[7px] translate-y-[2px] bg-[#8b5cf6]"
      />
    </pre>
  );
}
