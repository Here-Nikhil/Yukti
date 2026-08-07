import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Ambiguity } from "@/lib/yukti-api";

export function AmbiguityCards({ ambiguities }: { ambiguities: Ambiguity[] }) {
  const list = ambiguities.map((a) => String(a?.raw ?? "")).filter(Boolean);
  const prompt = `Your previous response was ambiguous in the following ways:\n${list
    .map((r) => `- ${r}`)
    .join("\n")}\n\nPlease rewrite your response with explicit file paths, exact code blocks to replace, and unified diff format where possible.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  };

  return (
    <div className="grid gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-xl border border-[#2a2440] bg-[#1a1625] p-4"
        style={{ boxShadow: "0 0 24px -6px #8b5cf6", borderColor: "#8b5cf6" }}
      >
        <div className="text-sm font-semibold text-white">Ambiguous Instructions Detected</div>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-muted-foreground">
          {list.map((r, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {r}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
        className="rounded-xl border border-[#2a2440] bg-[#1a1625] p-4"
        style={{ boxShadow: "0 0 24px -6px #10b981", borderColor: "#10b981" }}
      >
        <div className="text-sm font-semibold text-white">Copy this clarification prompt</div>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-[#2a2440] bg-[#0d0b14] p-3 font-mono text-[12px] text-[#d6d1e6]">
          {prompt}
        </pre>
        <button
          onClick={copy}
          className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:scale-[1.02]"
          style={{ background: "#10b981" }}
        >
          <Copy className="h-4 w-4" /> Copy
        </button>
      </motion.div>
    </div>
  );
}
