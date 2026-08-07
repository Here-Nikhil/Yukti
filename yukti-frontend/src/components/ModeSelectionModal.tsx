import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Wrench, Zap } from "lucide-react";
import { useState } from "react";
import { YuktiLogo } from "./YuktiLogo";
import { saveUserMode, type UserMode } from "@/lib/user-mode";
import { toast } from "sonner";

export function ModeSelectionModal({
  open,
  uid,
  onDone,
}: {
  open: boolean;
  uid: string;
  onDone: (mode: UserMode) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState<UserMode | null>(null);

  const choose = async (mode: UserMode) => {
    try {
      setSaving(mode);
      await saveUserMode(uid, mode, mode === "auto" ? apiKey.trim() : undefined);
      onDone(mode);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save your preference. Try again.");
      setSaving(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <div className="absolute inset-0 bg-background/80" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative z-10 w-full max-w-4xl"
          >
            <div className="mb-8 flex flex-col items-center text-center">
              <YuktiLogo />
              <h2 className="mt-6 text-3xl font-semibold">How do you want to work?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You can change this anytime in settings.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Manual */}
              <motion.div
                whileHover={{ y: -3 }}
                className="glass rounded-2xl p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold">Manual</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paste LLM output and Yukti applies it. No API key needed. Free forever.
                </p>
                <button
                  onClick={() => choose("manual")}
                  disabled={saving !== null}
                  className="mt-6 w-full rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition hover:scale-[1.02] hover:shadow-[0_0_24px_-4px_#8b5cf6] disabled:opacity-60"
                >
                  {saving === "manual" ? "Saving…" : "Continue with Manual"}
                </button>
              </motion.div>

              {/* Auto */}
              <motion.div
                whileHover={{ y: -3 }}
                className="glass rounded-2xl p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold">Auto (AI-powered)</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full chat interface. Yukti resolves ambiguities automatically using Claude.
                </p>

                <label className="mt-4 block text-xs font-medium text-muted-foreground">
                  Your Claude API Key
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={reveal ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 pr-10 font-mono text-sm outline-none transition focus:border-[#8b5cf6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.2)]"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Stored securely in your account. Never shared.
                </p>

                <button
                  onClick={() => choose("auto")}
                  disabled={!apiKey.trim() || saving !== null}
                  className="mt-4 w-full rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:scale-[1.02] enabled:hover:shadow-[0_0_24px_-4px_#8b5cf6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving === "auto" ? "Saving…" : "Continue with Auto"}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
