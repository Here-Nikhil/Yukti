import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  FileCode2,
  Folder,
  FolderOpen,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  buildTree,
  getProject,
  saveProjectFiles,
  type Project,
  type ProjectFile,
  type TreeNode,
} from "@/lib/projects";
import { getUserProfile, type UserMode } from "@/lib/user-mode";
import {
  applyInstructions,
  parseLlmOutput,
  saveUpdatedFilesToFirestore,
  streamChat,
  type Ambiguity,
} from "@/lib/yukti-api";
import { AmbiguityCards } from "@/components/AmbiguityCards";


export const Route = createFileRoute("/project/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Workspace — Yukti" },
      { name: "description", content: "Apply LLM code changes to your project." },
      { property: "og:title", content: "Workspace — Yukti" },
      { property: "og:description", content: "Yukti project workspace." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [mode, setMode] = useState<UserMode>("manual");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      const [p, profile] = await Promise.all([getProject(id), getUserProfile(user.uid)]);
      if (cancelled) return;
      if (!p) {
        toast.error("Project not found");
        navigate({ to: "/dashboard" });
        return;
      }
      setProject(p);
      setActivePath(p.files[0]?.path ?? null);
      setMode(profile?.mode ?? "manual");
      setFetching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  const tree = useMemo(() => (project ? buildTree(project.files) : null), [project]);
  const activeFile = useMemo(
    () => project?.files.find((f) => f.path === activePath) ?? null,
    [project, activePath],
  );

  if (fetching || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="yukti-shimmer h-12 w-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0b14] text-foreground">
      {/* Left column */}
      <aside
        className="flex h-full w-[260px] flex-col border-r border-[#2a2440] bg-[#1a1625]"
      >
        <div className="border-b border-[#2a2440] px-4 py-4">
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to dashboard
          </Link>
          <div className="mt-3 truncate text-sm font-semibold text-white">{project.name}</div>
          <span className="mt-1 inline-block rounded-full bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] font-medium text-[#c4b5fd]">
            {project.files.length} files
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {tree && (
            <FileTree
              node={tree}
              depth={0}
              activePath={activePath}
              onPick={setActivePath}
              indexRef={{ i: 0 }}
            />
          )}
          {project.files.length === 0 && (
            <div className="px-3 py-6 text-xs text-muted-foreground">
              No files yet. Paste code into the instruction panel to get started.
            </div>
          )}
        </div>
        <div className="border-t border-[#2a2440] px-4 py-3 text-[11px] text-[#8b87a0]">
          <div>Changes Applied: 0</div>
          <div>Pending: 0</div>
        </div>
      </aside>

      {/* Center column */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#2a2440] bg-[#141020] px-5 py-3">
          <div className="truncate font-mono text-xs text-muted-foreground">
            {activeFile ? activeFile.path : project.name}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              mode === "auto"
                ? "bg-[#8b5cf6]/25 text-[#c4b5fd]"
                : "bg-[#2a2440] text-[#c4b5fd]"
            }`}
          >
            {mode === "auto" ? "Auto" : "Manual"}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {activeFile ? (
            <Editor
              key={activeFile.path}
              height="100%"
              theme="vs-dark"
              path={activeFile.path}
              defaultLanguage={langFor(activeFile.path)}
              value={activeFile.content}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontFamily: "JetBrains Mono, ui-monospace",
                fontSize: 13,
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
              onMount={(_editor, monaco) => {
                monaco.editor.defineTheme("yukti-dark", {
                  base: "vs-dark",
                  inherit: true,
                  rules: [],
                  colors: {
                    "editor.background": "#0d0b14",
                    "editorGutter.background": "#0d0b14",
                    "editor.lineHighlightBackground": "#1a1625",
                  },
                });
                monaco.editor.setTheme("yukti-dark");
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <div>
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold">No files yet.</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Paste a file's content in the instruction panel to get started.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Right column */}
      <InstructionPanel
        mode={mode}
        project={project}
        onFilesChange={async (files) => {
          setProject({ ...project, files });
          await saveProjectFiles(project.id, files).catch(() =>
            toast.error("Couldn't persist file changes"),
          );
        }}
      />
    </div>
  );
}

/* ----------------------- File tree ----------------------- */

function FileTree({
  node,
  depth,
  activePath,
  onPick,
  indexRef,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onPick: (p: string) => void;
  indexRef: { i: number };
}) {
  return (
    <>
      {node.children.map((child) =>
        child.isDir ? (
          <DirRow
            key={child.path}
            node={child}
            depth={depth}
            activePath={activePath}
            onPick={onPick}
            indexRef={indexRef}
          />
        ) : (
          <FileRow
            key={child.path}
            node={child}
            depth={depth}
            active={activePath === child.path}
            onPick={onPick}
            index={indexRef.i++}
          />
        ),
      )}
    </>
  );
}

function DirRow({
  node,
  depth,
  activePath,
  onPick,
  indexRef,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onPick: (p: string) => void;
  indexRef: { i: number };
}) {
  const [open, setOpen] = useState(depth < 1);
  const index = indexRef.i++;
  return (
    <div>
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] text-[#d6d1e6] hover:bg-white/5"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 text-[#c4b5fd]" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-[#c4b5fd]" />
        )}
        <span className="truncate">{node.name}</span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <FileTree
              node={node}
              depth={depth + 1}
              activePath={activePath}
              onPick={onPick}
              indexRef={indexRef}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileRow({
  node,
  depth,
  active,
  onPick,
  index,
}: {
  node: TreeNode;
  depth: number;
  active: boolean;
  onPick: (p: string) => void;
  index: number;
}) {
  const color = colorFor(node.name);
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onPick(node.path)}
      className={`flex w-full items-center gap-1.5 rounded-md py-1 text-left text-[13px] transition ${
        active
          ? "border-l-2 border-[#8b5cf6] bg-[#8b5cf6]/15 text-white"
          : "border-l-2 border-transparent text-[#d6d1e6] hover:bg-white/5"
      }`}
      style={{ paddingLeft: 8 + depth * 12 + 14 }}
    >
      <FileIcon className="h-3.5 w-3.5" style={{ color }} />
      <span className="truncate">{node.name}</span>
    </motion.button>
  );
}

function colorFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx") return "#c4b5fd";
  if (ext === "js" || ext === "jsx") return "#facc15";
  if (ext === "py") return "#60a5fa";
  if (ext === "json") return "#9ca3af";
  if (ext === "md") return "#ffffff";
  return "#8b87a0";
}

function langFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
  };
  return map[ext] ?? "plaintext";
}

/* --------------------- Instruction Panel --------------------- */

type Step = { emoji: string; label: string; done: string; status: "pending" | "running" | "done" };

function InstructionPanel({
  mode,
  project,
  onFilesChange,
}: {
  mode: UserMode;
  project: Project;
  onFilesChange: (files: ProjectFile[]) => void;
}) {
  const [tab, setTab] = useState<"manual" | "auto">(mode === "auto" ? "auto" : "manual");
  const [instruction, setInstruction] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [diff, setDiff] = useState<Array<{ type: "add" | "del" | "ctx"; line: string; n: number }> | null>(null);
  const [chat, setChat] = useState<Array<{ role: "user" | "yukti"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  const [ambiguities, setAmbiguities] = useState<Ambiguity[] | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "parsing" | "applying">("idle");

  const runProcessing = async () => {
    if (!instruction.trim()) {
      toast.error("Paste some LLM output first.");
      return;
    }
    if (running) return;
    setRunning(true);
    setPhase("parsing");
    setDiff(null);
    setAmbiguities(null);
    const base: Step[] = [
      { emoji: "📂", label: "Reading project files...", done: "Done", status: "done" },
      { emoji: "🤖", label: "Parsing instructions...", done: "Done", status: "running" },
      { emoji: "🔍", label: "Finding anchor points...", done: "Done", status: "pending" },
      { emoji: "📐", label: "Checking indentation...", done: "Done", status: "pending" },
      { emoji: "🔧", label: "Generating diff...", done: "Ready", status: "pending" },
    ];
    setSteps(base);

    const mark = (i: number, status: Step["status"]) =>
      setSteps((s) => s.map((x, idx) => (idx === i ? { ...x, status } : x)));

    try {
      const parsed = await parseLlmOutput(
        instruction,
        project.files.map((f) => f.path),
      );
      mark(1, "done");

      if (Array.isArray(parsed.ambiguities) && parsed.ambiguities.length > 0) {
        setSteps([]);
        setAmbiguities(parsed.ambiguities);
        setPhase("idle");
        setRunning(false);
        return;
      }

      setPhase("applying");
      mark(2, "running");
      const applied = await applyInstructions(project.id, parsed.instructions, project.files);

      mark(2, "done");
      mark(3, "done");
      mark(4, "running");

      const rows: Array<{ type: "add" | "del" | "ctx"; line: string; n: number }> = [];
      for (const entry of applied.diffs ?? []) {
        const label = entry.path ?? entry.file ?? "";
        if (label) rows.push({ type: "ctx", line: `— ${label}`, n: 0 });
        const lines = (entry.diff ?? "").split("\n");
        let n = 1;
        for (const l of lines) {
          if (l.startsWith("+++") || l.startsWith("---") || l.startsWith("@@")) {
            rows.push({ type: "ctx", line: l, n: 0 });
            continue;
          }
          if (l.startsWith("+")) rows.push({ type: "add", line: l.slice(1), n: n++ });
          else if (l.startsWith("-")) rows.push({ type: "del", line: l.slice(1), n: n });
          else rows.push({ type: "ctx", line: l.replace(/^ /, ""), n: n++ });
        }
      }
      setDiff(rows);
      mark(4, "done");

      const updated = applied.updated_files ?? [];
      if (updated.length > 0) {
        const merged = [...project.files];
        for (const u of updated) {
          const idx = merged.findIndex((f) => f.path === u.path);
          if (idx >= 0) merged[idx] = { path: u.path, content: u.content };
          else merged.push({ path: u.path, content: u.content });
        }
        onFilesChange(merged);
        await saveUpdatedFilesToFirestore(project.id, updated).catch(() =>
          toast.error("Couldn't sync files to the cloud"),
        );
      }

      if ((applied.diffs ?? []).some((d) => d.applied === false)) {
        toast.warning("Some changes could not be applied automatically.", {
          style: { color: "#f43f5e", borderColor: "#f43f5e" },
        });
      }
    } catch (e) {
      console.error(e);
      setSteps([]);
      toast.error(e instanceof Error ? e.message : "Something went wrong", {
        style: { color: "#f43f5e", borderColor: "#f43f5e" },
      });
    } finally {
      setRunning(false);
    }
  };

  const applyDiff = () => {
    toast.success("Changes applied");
    setDiff(null);
    setSteps([]);
    setInstruction("");
  };


  return (
    <aside className="flex h-full w-[380px] flex-col border-l border-[#2a2440] bg-[#1a1625]">
      <div className="border-b border-[#2a2440] p-4">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Paste LLM Output Here
        </label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Paste what Claude, ChatGPT, or any AI told you..."
          className="mt-2 h-40 w-full resize-none rounded-lg border border-[#2a2440] bg-[#0d0b14] p-3 font-mono text-[12.5px] text-foreground outline-none transition placeholder:text-[#5a556f] focus:border-[#8b5cf6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)]"
        />
      </div>

      <div className="flex border-b border-[#2a2440] px-2 pt-2">
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
          Manual
        </TabButton>
        <TabButton active={tab === "auto"} onClick={() => setTab("auto")}>
          Auto (AI)
        </TabButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "manual" ? (
          <ManualTab
            steps={steps}
            diff={diff}
            ambiguities={ambiguities}
            onRun={runProcessing}
            onApply={applyDiff}
            onDiscard={() => {
              setDiff(null);
              setSteps([]);
              setAmbiguities(null);
              toast("Discarded");
            }}
          />

        ) : mode !== "auto" ? (
          <div className="rounded-xl border border-[#2a2440] bg-[#0d0b14] p-5 text-sm">
            <div className="font-semibold">You're in Manual mode.</div>
            <p className="mt-1 text-muted-foreground">
              Switch to Auto in settings to enable AI chat.
            </p>
            <Link
              to="/dashboard"
              className="mt-3 inline-block text-[13px] font-medium text-[#c4b5fd] hover:underline"
            >
              Go to Settings →
            </Link>
          </div>
        ) : (
          <AutoChat
            chat={chat}
            setChat={setChat}
            input={chatInput}
            setInput={setChatInput}
            files={project.files}
          />

        )}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-sm transition ${
        active ? "text-white" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#8b5cf6]"
        />
      )}
    </button>
  );
}

function ManualTab({
  steps,
  diff,
  ambiguities,
  onRun,
  onApply,
  onDiscard,
}: {
  steps: Step[];
  diff: Array<{ type: "add" | "del" | "ctx"; line: string; n: number }> | null;
  ambiguities: Ambiguity[] | null;
  onRun: () => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="space-y-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
        onClick={onRun}
        className="w-full rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition hover:shadow-[0_0_24px_-4px_#8b5cf6]"
      >
        Apply Instructions
      </motion.button>

      {ambiguities && ambiguities.length > 0 && <AmbiguityCards ambiguities={ambiguities} />}


      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-[#2a2440] bg-[#0d0b14] p-3"
            >
              <div className="flex items-center gap-2 text-[13px]">
                <span className="w-5">{s.emoji}</span>
                <span
                  className={
                    s.status === "pending" ? "text-muted-foreground" : "text-foreground"
                  }
                >
                  {s.label}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {s.status === "done" ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 14 }}
                      className="text-emerald-400"
                    >
                      ✔ {s.done}
                    </motion.span>
                  ) : s.status === "running" ? (
                    "Working…"
                  ) : (
                    ""
                  )}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#2a2440]">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      s.status === "done" ? "100%" : s.status === "running" ? "80%" : "0%",
                  }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="h-full bg-[#8b5cf6]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {diff && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-[#2a2440] bg-[#0d0b14]"
        >
          <div className="border-b border-[#2a2440] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Diff preview
          </div>
          <div className="font-mono text-[12px]">
            {diff.map((row, i) => (
              <div
                key={i}
                className={`flex ${
                  row.type === "add"
                    ? "bg-emerald-500/10"
                    : row.type === "del"
                      ? "bg-rose-500/10"
                      : ""
                }`}
              >
                <span className="w-8 shrink-0 select-none px-2 py-0.5 text-right text-muted-foreground">
                  {row.n}
                </span>
                <span
                  className={`w-4 shrink-0 select-none ${
                    row.type === "add"
                      ? "text-emerald-400"
                      : row.type === "del"
                        ? "text-rose-400"
                        : "text-transparent"
                  }`}
                >
                  {row.type === "add" ? "+" : row.type === "del" ? "-" : " "}
                </span>
                <span className="flex-1 whitespace-pre py-0.5 pr-2">{row.line}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-[#2a2440] p-3">
            <button
              onClick={onApply}
              className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:scale-[1.02]"
            >
              Apply Changes
            </button>
            <button
              onClick={onDiscard}
              className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:scale-[1.02]"
            >
              Discard
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AutoChat({
  chat,
  setChat,
  input,
  setInput,
  files,
}: {
  chat: Array<{ role: "user" | "yukti"; text: string }>;
  setChat: React.Dispatch<React.SetStateAction<Array<{ role: "user" | "yukti"; text: string }>>>;
  input: string;
  setInput: (s: string) => void;
  files: ProjectFile[];
}) {
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const history = chat.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));
    setChat((c) => [...c, { role: "user", text }, { role: "yukti", text: "" }]);
    setInput("");
    setSending(true);
    try {
      await streamChat(text, history, files, (chunk) => {
        setChat((c) => {
          const next = [...c];
          const last = next[next.length - 1];
          if (last && last.role === "yukti") next[next.length - 1] = { ...last, text: last.text + chunk };
          return next;
        });
      });
    } catch (e) {
      console.error(e);
      toast.error("Chat error. Please try again.", {
        style: { color: "#f43f5e", borderColor: "#f43f5e" },
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        {chat.length === 0 && (
          <div className="rounded-xl border border-[#2a2440] bg-[#0d0b14] p-4 text-sm text-muted-foreground">
            Ask Yukti to change anything in your project. It has all your files open.
          </div>
        )}
        {chat.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-[#8b5cf6] text-white"
                  : "border border-[#2a2440] bg-[#1a1625] text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[#2a2440] pt-3">
        <div className="mb-1 text-[11px] text-muted-foreground">
          Yukti has your project files open.
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask Yukti…"
            className="flex-1 rounded-lg border border-[#2a2440] bg-[#0d0b14] px-3 py-2 text-sm outline-none focus:border-[#8b5cf6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)]"
          />
          <button
            onClick={send}
            className="rounded-lg bg-[#8b5cf6] p-2 text-white transition hover:scale-[1.05]"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
