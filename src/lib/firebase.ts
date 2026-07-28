import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Firebase Web apiKey is a publishable identifier, not a secret.
// Security is enforced by Firebase Auth + Firestore/Storage rules.
const firebaseConfig = {
  apiKey: "AIzaSyCcQXEM0LVAhjakxDr_n_iUMHRRnfzHKOQ",
  authDomain: "yukti-app-6cc00.firebaseapp.com",
  projectId: "yukti-app-6cc00",
  storageBucket: "yukti-app-6cc00.firebasestorage.app",
  messagingSenderId: "581534519372",
  appId: "1:581534519372:web:58b4a2265123a7825c24e9",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

// Lazy accessors — safe to import from SSR modules; only initialize on use (client).
export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(ensureApp());
  return _auth;
}
export function getDb(): Firestore {
  if (!_db) _db = getFirestore(ensureApp());
  return _db;
}
export function getStorageBucket(): FirebaseStorage {
  if (!_storage) _storage = getStorage(ensureApp());
  return _storage;
}
