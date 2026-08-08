import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "./firebase";
import type { ProjectFile } from "./projects";

export const YUKTI_API = "https://yukti-production-2cec.up.railway.app";

export type Ambiguity = { raw: string; [k: string]: unknown };

export type ParseResponse = {
  instructions?: unknown;
  ambiguities?: Ambiguity[];
};

export type DiffEntry = {
  path?: string;
  file?: string;
  diff?: string;
  applied?: boolean;
};

export type ApplyResponse = {
  diffs?: DiffEntry[];
  updated_files?: ProjectFile[];
  applied?: number;
};


async function authHeader(): Promise<Record<string, string>> {
  const u = getFirebaseAuth().currentUser;
  if (!u) throw new Error("Not signed in");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function parseLlmOutput(
  llmOutput: string,
  availableFiles: string[],
): Promise<ParseResponse> {
  const res = await fetch(`${YUKTI_API}/parse`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ llm_output: llmOutput, available_files: availableFiles }),
  });
  if (!res.ok) throw new Error(`Parse failed (${res.status})`);
  return (await res.json()) as ParseResponse;
}

export async function applyInstructions(
  projectId: string,
  instructions: unknown,
  files: ProjectFile[],
): Promise<ApplyResponse> {
  const res = await fetch(`${YUKTI_API}/apply`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({
      project_id: projectId,
      instructions,
      files: files.map((f) => ({ path: f.path, content: f.content })),
    }),
  });
  if (!res.ok) throw new Error(`Apply failed (${res.status})`);
  return (await res.json()) as ApplyResponse;
}

export function languageFor(path: string): string {
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

function fileIdFor(path: string): string {
  return path.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

export async function saveUpdatedFilesToFirestore(
  projectId: string,
  files: ProjectFile[],
): Promise<void> {
  const db = getDb();
  await Promise.all(
    files.map((f) =>
      setDoc(
        doc(collection(db, "projects", projectId, "files"), fileIdFor(f.path)),
        {
          path: f.path,
          content: f.content,
          language: languageFor(f.path),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ),
  );
}

/** Streams /chat SSE chunks; calls onChunk per chunk until [DONE]. */
export async function streamChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  projectFiles: ProjectFile[],
  onChunk: (chunk: string) => void,
): Promise<void> {
  const res = await fetch(`${YUKTI_API}/chat`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({
      message,
      history,
      project_files: projectFiles.map((f) => ({ path: f.path, content: f.content })),
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Chat failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).replace(/^ /, "");
      if (data === "[DONE]") return;
      onChunk(data);
    }
  }
}
