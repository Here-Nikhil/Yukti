import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { UserMode } from "./user-mode";

export type ChatMessage = {
  id?: string;
  role: "user" | "yukti";
  text: string;
  mode: UserMode;
  createdAt?: unknown;
};

function messagesCol(projectId: string) {
  return collection(getDb(), "projects", projectId, "messages");
}

export async function listMessages(projectId: string): Promise<ChatMessage[]> {
  const snap = await getDocs(query(messagesCol(projectId), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
}

export async function addMessage(
  projectId: string,
  msg: { role: "user" | "yukti"; text: string; mode: UserMode },
): Promise<string> {
  const ref = await addDoc(messagesCol(projectId), { ...msg, createdAt: serverTimestamp() });
  return ref.id;
}

export async function clearMessages(projectId: string): Promise<void> {
  const snap = await getDocs(messagesCol(projectId));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
