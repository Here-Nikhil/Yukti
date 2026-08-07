import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { FolderPlus, Upload, LogOut, FileCode2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Aurora } from "@/components/Aurora";
import { YuktiLogo } from "@/components/YuktiLogo";
import { ModeSelectionModal } from "@/components/ModeSelectionModal";
import { NewProjectModal } from "@/components/NewProjectModal";
import { ZipUploadOverlay, type ZipStep } from "@/components/ZipUploadOverlay";
import { useAuth } from "@/lib/auth-context";
import { getUserProfile, type UserMode } from "@/lib/user-mode";
import {
  createProject,
  extractZipToFiles,
  listProjects,
  type Project,
} from "@/lib/projects";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Yukti" },
      { name: "description", content: "Your Yukti projects and recent applies." },
      { property: "og:title", content: "Dashboard — Yukti" },
      { property: "og:description", content: "Your projects on Yukti." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [_mode, setMode] = useState<UserMode | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSteps, setUploadSteps] = useState<ZipStep[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Load profile → show mode modal if first login
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const profile = await getUserProfile(user.uid);
      if (cancelled) return;
      if (!profile?.mode) {
        setShowModeModal(true);
      } else {
        setMode(profile.mode);
      }
      const list = await listProjects(user.uid).catch(() => []);
      if (!cancelled) setProjects(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleZip = useCallback(
    async (file: File) => {
      if (!user) return;
      if (!/\.zip$/i.test(file.name)) {
        toast.error("Please drop a .zip file.");
        return;
      }
      setUploadFile(file);
      const steps: ZipStep[] = [
        { emoji: "📂", label: "Extracting ZIP...", status: "running" },
        { emoji: "🌲", label: "Building file tree...", status: "pending" },
        { emoji: "💾", label: "Saving to your account...", status: "pending" },
        { emoji: "✔", label: "Project ready", status: "pending" },
      ];
      setUploadSteps(steps);

      try {
        const files = await extractZipToFiles(file);
        setUploadSteps((s) => s.map((x, i) => (i === 0 ? { ...x, status: "done" } : i === 1 ? { ...x, status: "running" } : x)));
        await new Promise((r) => setTimeout(r, 350));
        setUploadSteps((s) => s.map((x, i) => (i === 1 ? { ...x, status: "done" } : i === 2 ? { ...x, status: "running" } : x)));
        const name = file.name.replace(/\.zip$/i, "");
        const id = await createProject(user.uid, name, files);
        setUploadSteps((s) => s.map((x, i) => (i === 2 ? { ...x, status: "done" } : i === 3 ? { ...x, status: "done" } : x)));
        await new Promise((r) => setTimeout(r, 450));
        toast.success(`Imported ${files.length} files`);
        navigate({ to: "/project/$id", params: { id } });
      } catch (e) {
        console.error(e);
        toast.error("Couldn't import that ZIP.");
        setUploadFile(null);
        setUploadSteps([]);
      }
    },
    [user, navigate],
  );

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleZip(file);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleZip]);

  if (loading || !user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <Aurora />
        <div className="yukti-shimmer relative z-10 h-12 w-40 rounded-xl" />
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "there";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/">
          <YuktiLogo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs md:block">
            <div className="font-medium text-foreground">{displayName}</div>
            <div className="text-muted-foreground">{user.email}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {displayName[0]?.toUpperCase()}
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 mb-10"
        >
          <h1 className="text-3xl font-semibold md:text-4xl">
            Welcome back, <span className="yukti-gradient-text">{displayName}</span>.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Drop a project ZIP anywhere on this page to get started, or create one from scratch.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <ActionCard
            icon={<FolderPlus className="h-5 w-5" />}
            title="New project"
            body="Create an empty workspace and paste code as you go."
            onClick={() => setShowNewProject(true)}
          />
          <ActionCard
            icon={<Upload className="h-5 w-5" />}
            title="Upload a ZIP"
            body="Drop a compressed project folder — Yukti will index it in seconds."
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleZip(f);
              e.target.value = "";
            }}
          />
        </div>

        <section className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent projects</h2>
            <span className="text-xs text-muted-foreground">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="glass rounded-3xl border-dashed p-12 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <FileCode2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">No projects yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Your projects will appear here. Drop a ZIP anywhere on this page, or start a fresh
                workspace above.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to="/project/$id"
                  params={{ id: p.id }}
                  className="glass rounded-2xl p-5 transition hover:border-primary/50 hover:scale-[1.01]"
                >
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {p.files?.length ?? 0} files
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <ZipUploadOverlay
        visible={dragging || !!uploadFile}
        dropActive={dragging}
        filename={uploadFile?.name ?? null}
        steps={uploadSteps}
      />

      <ModeSelectionModal
        open={showModeModal}
        uid={user.uid}
        onDone={(m) => {
          setMode(m);
          setShowModeModal(false);
          toast.success(`You're all set — ${m === "auto" ? "Auto" : "Manual"} mode enabled.`);
        }}
      />

      <NewProjectModal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={async (name) => {
          const id = await createProject(user.uid, name, []);
          setShowNewProject(false);
          toast.success("Project created");
          navigate({ to: "/project/$id", params: { id } });
        }}
      />
    </div>
  );
}

function ActionCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass group rounded-2xl p-6 text-left transition hover:border-primary/50"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </motion.button>
  );
}
