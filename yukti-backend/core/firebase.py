import json
import os

import firebase_admin
from firebase_admin import credentials, auth, firestore


def init_firebase() -> None:
    if not firebase_admin._apps:
        cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        if not cred_json:
            raise RuntimeError(
                "FIREBASE_CREDENTIALS_JSON environment variable is not set. "
                "Export the service-account JSON as a single-line string."
            )
        cred_dict = json.loads(cred_json)
        # Fix newlines in private key that dotenv escapes
        cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)


def get_firestore() -> firestore.Client:
    """Return a Firestore client (thread-safe singleton)."""
    return firestore.client()


def get_auth() -> auth:
    """Return the firebase_admin.auth module for token verification."""
    return auth
