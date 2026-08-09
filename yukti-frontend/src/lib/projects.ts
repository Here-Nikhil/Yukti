import JSZip from "jszip";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { UserMode } from "./user-mode";

export type ProjectFile = { path: string; content: string };

export type Project = {
  id: string;
  name: string;
  ownerId: string;
  files: ProjectFile[];
  mode?: UserMode;
  appliedCount?: number;
  updatedAt?: unknown;
  createdAt?: unknown;
};


const MAX_FILE_BYTES = 200_000; // per file cap for Firestore

const BINARY_EXT = new Set([
  "png","jpg","jpeg","gif","webp","ico","pdf","zip","tar","gz","mp3","mp4",
  "mov","wav","woff","woff2","ttf","eot","otf","exe","dll","so","bin",
]);

function isTexty(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (BINARY_EXT.has(ext)) return false;
  return true;
}

export async function extractZipToFiles(zipFile: File): Promise<ProjectFile[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const out: ProjectFile[] = [];
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  for (const entry of entries) {
    // Strip common wrapper folder (e.g. project-name/)
    let path = entry.name;
    if (path.startsWith("__MACOSX/") || path.endsWith(".DS_Store")) continue;
    if (!isTexty(path)) {
      out.push({ path, content: "[binary file — not previewed]" });
      continue;
    }
    let content = await entry.async("string");
    if (content.length > MAX_FILE_BYTES) {
      content = content.slice(0, MAX_FILE_BYTES) + "\n\n/* …truncated by Yukti */";
    }
    out.push({ path, content });
  }
  // If everything is under one common folder, strip it
  const roots = new Set(out.map((f) => f.path.split("/")[0]));
  if (roots.size === 1) {
    const prefix = [...roots][0] + "/";
    for (const f of out) {
      if (f.path.startsWith(prefix)) f.path = f.path.slice(prefix.length);
    }
  }
  return out.filter((f) => f.path.length > 0);
}

export async function createProject(
  ownerId: string,
  name: string,
  files: ProjectFile[],
  mode?: UserMode,
): Promise<string> {
  const ref = await addDoc(collection(getDb(), "projects"), {
    name,
    ownerId,
    files,
    mode: mode ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(getDb(), "projects", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function saveProjectFiles(id: string, files: ProjectFile[]): Promise<void> {
  await setDoc(
    doc(getDb(), "projects", id),
    { files, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function listProjects(ownerId: string): Promise<Project[]> {
  try {
    const q = query(
      collection(getDb(), "projects"),
      where("ownerId", "==", ownerId),
      orderBy("updatedAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("index")) {
      const q2 = query(
        collection(getDb(), "projects"),
        where("ownerId", "==", ownerId),
      );
      const snap = await getDocs(q2);
      const results = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }));
      return results.sort((a, b) => {
        const at = (a.updatedAt as { seconds?: number })?.seconds ?? 0;
        const bt = (b.updatedAt as { seconds?: number })?.seconds ?? 0;
        return bt - at;
      });
    }
    throw err;
  }
}

export async function getMostRecentProject(ownerId: string): Promise<Project | null> {
  const q = query(
    collection(getDb(), "projects"),
    where("ownerId", "==", ownerId),
    orderBy("updatedAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  const d = snap.docs[0];
  return d ? { id: d.id, ...(d.data() as Omit<Project, "id">) } : null;
}

export async function setProjectMode(id: string, mode: UserMode): Promise<void> {
  await setDoc(doc(getDb(), "projects", id), { mode, updatedAt: serverTimestamp() }, { merge: true });
}

export async function bumpAppliedCount(id: string, by: number): Promise<void> {
  if (!by) return;
  await setDoc(
    doc(getDb(), "projects", id),
    { appliedCount: increment(by), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ---- Downloads ----
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadFile(file: ProjectFile): void {
  triggerDownload(
    new Blob([file.content], { type: "text/plain;charset=utf-8" }),
    file.path.split("/").pop() || "file.txt",
  );
}

export async function downloadAllAsZip(name: string, files: ProjectFile[]): Promise<void> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.path, f.content);
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${name || "project"}.zip`);
}



// ---- File tree helpers ----
export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
};

export function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let next = node.children.find((c) => c.name === part);
      if (!next) {
        next = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLast,
          children: [],
        };
        node.children.push(next);
      }
      node = next;
    }
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}
