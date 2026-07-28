import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { FolderPlus, Upload, LogOut, FileCode2, Clock } from "lucide-react";
import { Aurora } from "@/components/Aurora";
import { YuktiLogo } from "@/components/YuktiLogo";
import { useAuth } from "@/lib/auth-context";

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
  const [projects] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

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
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

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
          />
          <ActionCard
            icon={<Upload className="h-5 w-5" />}
            title="Upload a ZIP"
            body="Drop a compressed project folder — Yukti will index it in seconds."
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
                <div key={p.id} className="glass rounded-2xl p-5">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {p.updatedAt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary/60 px-16 py-14 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <div className="text-2xl font-semibold">Drop your project</div>
              <div className="text-sm text-muted-foreground">
                Yukti will unpack and index it automatically.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <motion.button
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
