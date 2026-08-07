import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";

export type UserMode = "manual" | "auto";

export type UserProfile = {
  mode: UserMode;
  claudeApiKey?: string | null;
  onboardedAt?: unknown;
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function saveUserMode(
  uid: string,
  mode: UserMode,
  claudeApiKey?: string,
): Promise<void> {
  await setDoc(
    doc(getDb(), "users", uid),
    {
      mode,
      claudeApiKey: mode === "auto" ? claudeApiKey ?? null : null,
      onboardedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
