import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ClipboardPaste,
  Download,
  File as FileIcon,
  FileCode2,
  FileUp,
  Folder,
  FolderOpen,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  buildTree,
  bumpAppliedCount,
  createProject,
  downloadAllAsZip,
  downloadFile,
  extractZipToFiles,
  getProject,
  listProjects,
  saveProjectFiles,
  setProjectMode,
  type Project,
  type ProjectFile,
  type TreeNode,
} from "@/lib/projects";
import { addMessage, clearMessages, listMessages } from "@/lib/chat-history";
import { getUserProfile, type UserMode } from "@/lib/user-mode";
import {
  applyInstructions,
  parseLlmOutput,
  saveUpdatedFilesToFirestore,
  streamChat,
  type Ambiguity,
} from "@/lib/yukti-api";
import { AmbiguityCards } from "@/components/AmbiguityCards";
import { ModeToggle } from "@/components/ModeToggle";
import { ModeSplash } from "@/components/ModeSplash";
import { SnapCode } from "@/components/SnapCode";
import { NewProjectModal } from "@/components/NewProjectModal";

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

type ChatEntry = { role: "user" | "yukti"; text: string };

function Workspace() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [mode, setMode] = useState<UserMode>("manual");
  const [fetching, setFetching] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [snap, setSnap] = useState<{ path: string; oldCode: string; newCode: string } | null>(null);

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
      setMode(p.mode ?? profile?.mode ?? "manual");
      setAppliedCount(p.appliedCount ?? 0);
      setShowSplash(!p.mode);
      setFetching(false);
      const history = await listMessages(id).catch(() => []);
      if (!cancelled) setChat(history.map((m) => ({ role: m.role, text: m.text })));
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

  const handleFilesChange = async (files: ProjectFile[]) => {
    if (!project) return;
    setProject({ ...project, files });
    if (activePath && !files.some((f) => f.path === activePath)) {
      setActivePath(files[0]?.path ?? null);
    }
    await saveProjectFiles(project.id, files).catch(() =>
      toast.error("Couldn't persist file changes"),
    );
  };

  const selectMode = async (m: UserMode) => {
    setMode(m);
    setShowSplash(false);
    if (project) await setProjectMode(project.id, m).catch(() => {});
  };

  const persistMessage = (role: "user" | "yukti", text: string) => {
    if (!project) return;
    void addMessage(project.id, { role, text, mode }).catch(() => {});
  };

  const handleClearHistory = () => {
    if (!project) return;
    toast("Clear this workspace's chat history?", {
      action: {
        label: "Clear",
        onClick: () => {
          setChat([]);
          void clearMessages(project.id)
            .then(() => toast.success("Chat history cleared"))
            .catch(() => toast.error("Couldn't clear history"));
        },
      },
    });
  };

  const handleDeleteFile = (path: string) => {
    if (!project) return;
    const target = project.files.find((f) => f.path === path);
    if (!target) return;
    toast(`Delete ${path}?`, {
      action: {
        label: "Delete",
        onClick: () => {
          void handleFilesChange(project.files.filter((f) => f.path !== path)).then(() =>
            toast.success(`Deleted ${path}`),
          );
        },
      },
    });
  };

  const handleDownloadFile = (path: string) => {
    const f = project?.files.find((x) => x.path === path);
    if (f) downloadFile(f);
  };

  if (fetching || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="yukti-shimmer h-12 w-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0b14] text-foreground">
      <AnimatePresence>
        {showSplash && <ModeSplash key="splash" onSelect={(m) => void selectMode(m)} />}
      </AnimatePresence>

      {/* Left column */}
      <aside className="flex h-full w-[260px] flex-col border-r border-[#2a2440] bg-[#1a1625]">
        <div className="border-b border-[#2a2440] px-4 py-4">
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to dashboard
          </Link>
          <div className="mt-3 truncate text-sm font-semibold text-white">{project.name}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block rounded-full bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] font-medium text-[#c4b5fd]">
              {project.files.length} files
            </span>
            {user && <WorkspaceSwitcher uid={user.uid} currentId={project.id} />}
          </div>
          <SidebarUploads
            files={project.files}
            onFilesChange={handleFilesChange}
            onPick={setActivePath}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {project.files.length > 0 && (
            <button
              type="button"
              onClick={() =>
                void downloadAllAsZip(project.name, project.files).then(() =>
                  toast.success("Download started"),
                )
              }
              className={`${ghostBtn} mb-2`}
            >
              <Download className="h-3.5 w-3.5" />
              Download All
            </button>
          )}
          {tree && (
            <FileTree
              node={tree}
              depth={0}
              activePath={activePath}
              onPick={setActivePath}
              onDownload={handleDownloadFile}
              onDelete={handleDeleteFile}
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
          <div>Changes Applied: {appliedCount}</div>
          <div>Pending: 0</div>
        </div>
      </aside>

      {/* Center column */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[#2a2440] bg-[#141020] px-5 py-3">
          <div className="truncate font-mono text-xs text-muted-foreground">
            {activeFile ? activeFile.path : project.name}
          </div>
          <ModeToggle value={mode} onChange={(m) => void selectMode(m)} />
        </div>
        <div className="relative min-h-0 flex-1">
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

          <AnimatePresence>
            {snap && (
              <motion.div
                key={snap.path}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-20 overflow-hidden bg-[#0d0b14] px-[26px] pt-3"
              >
                <SnapCode
                  oldCode={snap.oldCode}
                  newCode={snap.newCode}
                  showFor={120}
                  typeSpeed={5}
                  onDone={() => window.setTimeout(() => setSnap(null), 250)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Right column */}
      <InstructionPanel
        mode={mode}
        project={project}
        chat={chat}
        setChat={setChat}
        onPersistMessage={persistMessage}
        onClearHistory={handleClearHistory}
        onFilesChange={handleFilesChange}
        onApplied={(count) => {
          if (!count) return;
          setAppliedCount((c) => c + count);
          void bumpAppliedCount(project.id, count).catch(() => {});
        }}
        onSnap={(path, oldCode, newCode) => {
          setActivePath(path);
          setSnap({ path, oldCode, newCode });
        }}
      />
    </div>
  );
}

/* ----------------------- Workspace switcher ----------------------- */

function WorkspaceSwitcher({ uid, currentId }: { uid: string; currentId: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    void listProjects(uid)
      .then(setItems)
      .catch(() => setItems([]));
  }, [open, uid]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[10px] font-medium text-[#8b87a0] underline-offset-2 hover:text-[#c4b5fd] hover:underline"
      >
        New / Switch
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-6 z-40 max-h-64 w-[210px] overflow-y-auto rounded-lg border border-[#2a2440] bg-[#0d0b14] p-1 shadow-xl"
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[#c4b5fd] hover:bg-[#2a2440]"
              >
                <Plus className="h-3.5 w-3.5" /> New workspace
              </button>
              <div className="my-1 h-px bg-[#2a2440]" />
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (p.id !== currentId) navigate({ to: "/project/$id", params: { id: p.id } });
                  }}
                  className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[#2a2440] ${
                    p.id === currentId ? "text-white" : "text-[#d6d1e6]"
                  }`}
                >
                  {p.name}
                </button>
              ))}
              {items.length === 0 && (
                <div className="px-2 py-1.5 text-[11px] text-[#8b87a0]">No other workspaces</div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NewProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (name) => {
          const id = await createProject(uid, name, []);
          setCreating(false);
          toast.success("Workspace created");
          navigate({ to: "/project/$id", params: { id } });
        }}
      />
    </div>
  );
}

/* ----------------------- Sidebar uploads ----------------------- */

const ghostBtn =
  "flex w-full items-center gap-2 rounded-lg border border-[#2a2440] bg-[#0d0b14] px-2.5 py-1.5 text-[11px] font-medium text-[#c4b5fd] transition-colors hover:bg-[#2a2440] disabled:opacity-60";

function mergeFiles(existing: ProjectFile[], incoming: ProjectFile[]): ProjectFile[] {
  const map = new Map(existing.map((f) => [f.path, f]));
  for (const f of incoming) map.set(f.path, f);
  return [...map.values()];
}

function SidebarUploads({
  files,
  onFilesChange,
  onPick,
}: {
  files: ProjectFile[];
  onFilesChange: (files: ProjectFile[]) => void | Promise<void>;
  onPick: (path: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastePath, setPastePath] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const zipRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const handleZip = async (file: File) => {
    setBusy(true);
    try {
      const extracted = await extractZipToFiles(file);
      const merged = mergeFiles(files, extracted);
      await onFilesChange(merged);
      if (extracted[0]) onPick(extracted[0].path);
      toast.success(`Added ${extracted.length} files from ${file.name}`);
    } catch {
      toast.error("Couldn't read that ZIP archive");
    } finally {
      setBusy(false);
    }
  };

  const handleFileList = async (list: FileList) => {
    setBusy(true);
    try {
      const incoming = await Promise.all(
        Array.from(list).map(
          (f) =>
            new Promise<ProjectFile>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ path: f.name, content: String(reader.result ?? "") });
              reader.onerror = () => reject(reader.error);
              reader.readAsText(f);
            }),
        ),
      );
      const merged = mergeFiles(files, incoming);
      await onFilesChange(merged);
      if (incoming[0]) onPick(incoming[0].path);
      toast.success(`Added ${incoming.length} file${incoming.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't read those files");
    } finally {
      setBusy(false);
    }
  };

  const confirmPaste = async () => {
    const path = pastePath.trim();
    if (!path) {
      toast.error("Enter a file path");
      return;
    }
    setBusy(true);
    try {
      await onFilesChange(mergeFiles(files, [{ path, content: pasteContent }]));
      onPick(path);
      setPasteOpen(false);
      setPastePath("");
      setPasteContent("");
      toast.success(`Added ${path}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mt-3 space-y-1.5">
        <button type="button" className={ghostBtn} disabled={busy} onClick={() => zipRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          Upload ZIP
        </button>
        <button type="button" className={ghostBtn} disabled={busy} onClick={() => filesRef.current?.click()}>
          <FileUp className="h-3.5 w-3.5" />
          Upload Files
        </button>
        <button type="button" className={ghostBtn} disabled={busy} onClick={() => setPasteOpen(true)}>
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste File
        </button>
      </div>

      <input
        ref={zipRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleZip(f);
        }}
      />
      <input
        ref={filesRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (list && list.length) void handleFileList(list);
          e.target.value = "";
        }}
      />

      <AnimatePresence>
        {pasteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
            onClick={() => setPasteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl border border-[#2a2440] bg-[#1a1625] p-5"
            >
              <div className="text-sm font-semibold text-white">Paste a file</div>
              <input
                value={pastePath}
                onChange={(e) => setPastePath(e.target.value)}
                placeholder="src/utils/helper.ts"
                className="mt-4 w-full rounded-lg border border-[#2a2440] bg-[#0d0b14] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#8b5cf6]"
              />
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="File content…"
                rows={10}
                className="mt-3 w-full resize-none rounded-lg border border-[#2a2440] bg-[#0d0b14] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#8b5cf6]"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className={`${ghostBtn} w-auto`} onClick={() => setPasteOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmPaste()}
                  className="rounded-lg bg-[#8b5cf6] px-4 py-1.5 text-[11px] font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.45)] transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  Add file
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FileTree({
  node,
  depth,
  activePath,
  onPick,
  onDownload,
  onDelete,
  indexRef,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onPick: (p: string) => void;
  onDownload: (p: string) => void;
  onDelete: (p: string) => void;
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
            onDownload={onDownload}
            onDelete={onDelete}
            indexRef={indexRef}
          />
        ) : (
          <FileRow
            key={child.path}
            node={child}
            depth={depth}
            active={activePath === child.path}
            onPick={onPick}
            onDownload={onDownload}
            onDelete={onDelete}
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
  onDownload,
  onDelete,
  indexRef,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onPick: (p: string) => void;
  onDownload: (p: string) => void;
  onDelete: (p: string) => void;
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
              onDownload={onDownload}
              onDelete={onDelete}
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
  onDownload,
  onDelete,
  index,
}: {
  node: TreeNode;
  depth: number;
  active: boolean;
  onPick: (p: string) => void;
  onDownload: (p: string) => void;
  onDelete: (p: string) => void;
  index: number;
}) {
  const color = colorFor(node.name);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`group flex w-full items-center gap-1.5 rounded-md py-1 pr-1 text-left text-[13px] transition ${
        active
          ? "border-l-2 border-[#8b5cf6] bg-[#8b5cf6]/15 text-white"
          : "border-l-2 border-transparent text-[#d6d1e6] hover:bg-white/5"
      }`}
      style={{ paddingLeft: 8 + depth * 12 + 14 }}
    >
      <button
        type="button"
        onClick={() => onPick(node.path)}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <FileIcon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        type="button"
        aria-label={`Download ${node.name}`}
        onClick={() => onDownload(node.path)}
        className="shrink-0 rounded p-0.5 text-[#8b87a0] opacity-0 transition group-hover:opacity-100 hover:text-[#c4b5fd]"
      >
        <Download className="h-3 w-3" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${node.name}`}
        onClick={() => onDelete(node.path)}
        className="shrink-0 rounded p-0.5 text-[#8b87a0] opacity-0 transition group-hover:opacity-100 hover:text-[#f43f5e]"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </motion.div>
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
  chat,
  setChat,
  onPersistMessage,
  onClearHistory,
  onFilesChange,
  onApplied,
  onSnap,
}: {
  mode: UserMode;
  project: Project;
  chat: ChatEntry[];
  setChat: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
  onPersistMessage: (role: "user" | "yukti", text: string) => void;
  onClearHistory: () => void;
  onFilesChange: (files: ProjectFile[]) => void;
  onApplied: (count: number) => void;
  onSnap: (path: string, oldCode: string, newCode: string) => void;
}) {
  const [tab, setTab] = useState<"manual" | "auto">(mode === "auto" ? "auto" : "manual");
  const [instruction, setInstruction] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [diff, setDiff] = useState<Array<{ type: "add" | "del" | "ctx"; line: string; n: number }> | null>(null);
  const [chatInput, setChatInput] = useState("");

  const [ambiguities, setAmbiguities] = useState<Ambiguity[] | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "parsing" | "applying">("idle");

  // Keep the panel in sync with the always-visible top bar toggle.
  useEffect(() => {
    setTab(mode === "auto" ? "auto" : "manual");
  }, [mode]);

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
        const first = updated[0];
        const before = project.files.find((f) => f.path === first.path)?.content ?? "";
        const merged = [...project.files];
        for (const u of updated) {
          const idx = merged.findIndex((f) => f.path === u.path);
          if (idx >= 0) merged[idx] = { path: u.path, content: u.content };
          else merged.push({ path: u.path, content: u.content });
        }
        onFilesChange(merged);
        onSnap(first.path, before, first.content);
        await saveUpdatedFilesToFirestore(project.id, updated).catch(() =>
          toast.error("Couldn't sync files to the cloud"),
        );
      }

      const appliedCount =
        typeof applied.applied === "number"
          ? applied.applied
          : (applied.diffs ?? []).filter((d) => d.applied !== false).length;
      onApplied(appliedCount);

      if ((applied.diffs ?? []).some((d) => d.applied === false)) {
        toast.warning("Some changes could not be applied automatically.", {
          style: { color: "#f43f5e", borderColor: "#f43f5e" },
        });
      }
    } catch (e) {
      setSteps([]);
      toast.error(e instanceof Error ? e.message : "Something went wrong", {
        style: { color: "#f43f5e", borderColor: "#f43f5e" },
      });
    } finally {
      setPhase("idle");
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

      <div className="flex items-center border-b border-[#2a2440] px-2 pt-2">
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
          Manual
        </TabButton>
        <TabButton active={tab === "auto"} onClick={() => setTab("auto")}>
          Auto (AI)
        </TabButton>
        {tab === "auto" && (
          <button
            onClick={onClearHistory}
            className="ml-auto mb-1 rounded-md px-2 py-1 text-[11px] text-[#8b87a0] transition hover:text-[#f43f5e]"
          >
            Clear history
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "manual" ? (
          <ManualTab
            steps={steps}
            diff={diff}
            phase={phase}
            running={running}
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
        ) : (
          <AutoChat
            chat={chat}
            setChat={setChat}
            onPersistMessage={onPersistMessage}
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

function ProcessingOverlay({ phase }: { phase: "parsing" | "applying" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border border-[#8b5cf6]/40 bg-[#0d0b14] p-8"
    >
      <motion.div
        aria-hidden
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#8b5cf6]/15 to-transparent"
      />
      <div className="relative flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="h-9 w-9 rounded-full border-2 border-[#2a2440] border-t-[#8b5cf6]"
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="text-[13px] font-medium text-[#c4b5fd]"
          >
            {phase === "parsing" ? "Parsing instructions..." : "Applying changes..."}
          </motion.div>
        </AnimatePresence>
        <motion.div
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="h-1 w-32 rounded-full bg-[#8b5cf6]"
        />
      </div>
    </motion.div>
  );
}

function ManualTab({
  steps,
  diff,
  phase,
  running,
  ambiguities,
  onRun,
  onApply,
  onDiscard,
}: {
  steps: Step[];
  diff: Array<{ type: "add" | "del" | "ctx"; line: string; n: number }> | null;
  phase: "idle" | "parsing" | "applying";
  running: boolean;
  ambiguities: Ambiguity[] | null;
  onRun: () => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="space-y-4">
      <motion.button
        whileHover={running ? undefined : { scale: 1.02 }}
        whileTap={running ? undefined : { scale: 0.99 }}
        onClick={onRun}
        disabled={running}
        className="w-full rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition hover:shadow-[0_0_24px_-4px_#8b5cf6] disabled:opacity-60"
      >
        {running ? "Working…" : "Apply Instructions"}
      </motion.button>

      <AnimatePresence mode="wait">
        {running && phase !== "idle" ? (
          <ProcessingOverlay key="overlay" phase={phase} />
        ) : ambiguities && ambiguities.length > 0 ? (
          <motion.div
            key="ambiguities"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <AmbiguityCards ambiguities={ambiguities} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!running && steps.length > 0 && (
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
                  className={s.status === "pending" ? "text-muted-foreground" : "text-foreground"}
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
                    width: s.status === "done" ? "100%" : s.status === "running" ? "80%" : "0%",
                  }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="h-full bg-[#8b5cf6]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {diff && !running && (
          <motion.div
            key="diff"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
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
      </AnimatePresence>
    </div>
  );
}

function TypingDots() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1 py-0.5"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]"
        />
      ))}
    </motion.div>
  );
}

/** Renders a chat message, formatting ``` fenced code blocks. */
function MessageBody({ text }: { text: string }) {
  const parts = text.split(/```/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="my-2 overflow-x-auto rounded-lg border border-[#2a2440] bg-[#0d0b14] p-2.5 font-mono text-[11.5px] text-[#d6d1e6]"
          >
            {part.replace(/^[a-zA-Z]*\n/, "")}
          </pre>
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        ),
      )}
    </>
  );
}

function AutoChat({
  chat,
  setChat,
  onPersistMessage,
  input,
  setInput,
  files,
}: {
  chat: ChatEntry[];
  setChat: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
  onPersistMessage: (role: "user" | "yukti", text: string) => void;
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
    onPersistMessage("user", text);
    setInput("");
    setSending(true);
    let full = "";
    try {
      await streamChat(text, history, files, (chunk) => {
        full += chunk;
        setChat((c) => {
          const next = [...c];
          const last = next[next.length - 1];
          if (last && last.role === "yukti")
            next[next.length - 1] = { ...last, text: last.text + chunk };
          return next;
        });
      });
      if (full) onPersistMessage("yukti", full);
    } catch {
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
        <AnimatePresence initial={false}>
          {chat.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-[#8b5cf6] text-white"
                    : "border border-[#2a2440] bg-[#1a1625] text-foreground"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {m.role === "yukti" && m.text === "" && sending && i === chat.length - 1 ? (
                    <TypingDots key="dots" />
                  ) : (
                    <motion.div
                      key="text"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MessageBody text={m.text} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
