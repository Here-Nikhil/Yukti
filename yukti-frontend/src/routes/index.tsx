import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileCode2, Sparkles, GitBranch, Zap } from "lucide-react";
import { Aurora } from "@/components/Aurora";
import { YuktiLogo } from "@/components/YuktiLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yukti — Apply LLM code changes to your project, instantly" },
      {
        name: "description",
        content:
          "Yukti takes AI-generated code suggestions from Claude, ChatGPT, or Gemini and applies them straight to your project files — with diffs, review, and rollback.",
      },
      {
        property: "og:title",
        content: "Yukti — Apply LLM code changes to your project, instantly",
      },
      {
        property: "og:description",
        content:
          "Paste AI output. Watch it become a real diff on your codebase. Review, apply, roll back.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <YuktiLogo />
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Hero */}
        <section className="pt-16 pb-24 text-center md:pt-24 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            Now in private beta
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
          >
            Turn LLM answers into <span className="yukti-gradient-text">real code changes</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Paste output from Claude, ChatGPT, or Gemini. Yukti finds the right files, shows you a
            diff, and applies changes — with review and rollback.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-xl shadow-primary/30 transition hover:brightness-110"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="rounded-full border border-border bg-card/40 px-6 py-3 text-sm text-foreground backdrop-blur transition hover:bg-card/70"
            >
              See how it works
            </a>
          </motion.div>

          {/* Demo animation */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="mx-auto mt-20 max-w-5xl"
          >
            <DemoCard />
          </motion.div>
        </section>

        {/* Features */}
        <section id="how" className="py-24">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold md:text-5xl">
              Built for the way you <span className="yukti-gradient-text">actually</span> use AI.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No more copy-pasting one snippet at a time. Yukti understands multi-file changes and
              patches your project in seconds.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Feature
              icon={<FileCode2 className="h-5 w-5" />}
              title="Smart file matching"
              body="Fuzzy path resolution finds the right file even when the LLM guesses the location."
            />
            <Feature
              icon={<GitBranch className="h-5 w-5" />}
              title="Diffs & rollback"
              body="Every apply is a snapshot. Review the diff, keep what works, revert what doesn't."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Any model"
              body="Claude, ChatGPT, Gemini, Llama — if it outputs code, Yukti can apply it."
            />
          </div>
        </section>

        <footer className="border-t border-border/60 py-10 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Yukti. Crafted for developers who ship.
        </footer>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass rounded-2xl p-6"
    >
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function DemoCard() {
  const [phase, setPhase] = useState<"show" | "highlight" | "snap" | "type">("show");
  const [typed, setTyped] = useState(0);

  const wrongLine = `  const total = items.reduce((a, b) => a + b, 0);`;
  const newLines = `  const total = items.reduce((a, b) => a + b.price, 0);\n  const tax = total * 0.1;`;

  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("highlight"), 1500);
    const t2 = setTimeout(() => setPhase("snap"), 2400);
    const t3 = setTimeout(() => setPhase("type"), 3200);
    const t4 = setTimeout(() => {
      setPhase("show");
      setTyped(0);
      setCycle(c => c + 1);
    }, 3200 + newLines.length * 16 + 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [cycle]);

  useEffect(() => {
    if (phase !== "type") return;
    setTyped(0);
    const iv = setInterval(() => {
      setTyped(n => {
        if (n >= newLines.length) { clearInterval(iv); return n; }
        return n + 1;
      });
    }, 16);
    return () => clearInterval(iv);
  }, [phase]);

  const particles = useMemo(() =>
    wrongLine.split("").map((ch) => ({
      ch,
      dx: (Math.random() - 0.5) * 30,
      dy: -20 - Math.random() * 40,
      delay: Math.random() * 0.3,
    })),
  []);

  const diffLines = [
    { t: "- const total = items.reduce((a, b) => a + b, 0);", kind: "del" },
    { t: "+ const total = items.reduce((a, b) => a + b.price, 0);", kind: "add" },
    { t: "+ const tax = total * 0.1;", kind: "add" },
    { t: "  return { total, tax };", kind: "ctx" },
  ];

  return (
    <div className="glass overflow-hidden rounded-3xl border border-border/60 text-left shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">src/utils/checkout.ts</span>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
          Applying
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* LEFT — live animated code */}
        <div className="border-b border-border/60 bg-card/40 p-5 md:border-b-0 md:border-r min-h-[160px]">
          <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Code</div>
          <pre className="font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre">
            {"function calcTotal(items) {\n"}
            {phase === "show" && (
              <span>{wrongLine}{"\n"}</span>
            )}
            {phase === "highlight" && (
              <motion.span
                initial={{ backgroundColor: "transparent" }}
                animate={{ backgroundColor: "rgba(239,68,68,0.2)" }}
                className="block rounded text-red-300"
              >
                {wrongLine}{"\n"}
              </motion.span>
            )}
            {phase === "snap" && (
              <span className="inline-block">
                {"  "}
                {particles.map((p, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 1, y: 0, x: 0, color: "#fca5a5" }}
                    animate={{ opacity: 0, y: p.dy, x: p.dx, color: "#8b5cf6" }}
                    transition={{ duration: 0.7, delay: p.delay, ease: "easeOut" }}
                    className="inline-block"
                  >
                    {p.ch === " " ? "\u00A0" : p.ch}
                  </motion.span>
                ))}
                {"\n"}
              </span>
            )}
            {phase === "type" && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="block"
              >
                {newLines.slice(0, typed)}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  className="inline-block h-[1em] w-[6px] translate-y-[2px] bg-[#8b5cf6]"
                />
                {"\n"}
              </motion.span>
            )}
            {"  return { total, tax };\n}"}
          </pre>
        </div>

        {/* RIGHT — static diff preview */}
        <div className="p-5">
          <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Diff preview</div>
          <div className="space-y-1 font-mono text-xs">
            {diffLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.35 }}
                className={
                  line.kind === "add"
                    ? "rounded bg-green-500/10 px-2 py-1 text-green-300"
                    : line.kind === "del"
                      ? "rounded bg-red-500/10 px-2 py-1 text-red-300"
                      : "px-2 py-1 text-muted-foreground"
                }
              >
                {line.t}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}