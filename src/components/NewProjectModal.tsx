import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FolderPlus } from "lucide-react";

export function NewProjectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(name.trim());
      setName("");
    } finally {
      setBusy(false);
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
          style={{ backdropFilter: "blur(10px)" }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-background/70" />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="glass relative z-10 w-full max-w-md rounded-2xl p-6"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div className="text-lg font-semibold">New project</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Give your workspace a name. You can add files later.
            </p>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Project name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="my-awesome-app"
              className="mt-1.5 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-[#8b5cf6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.2)]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!name.trim() || busy}
                className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition enabled:hover:scale-[1.02] enabled:hover:shadow-[0_0_24px_-4px_#8b5cf6] disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
