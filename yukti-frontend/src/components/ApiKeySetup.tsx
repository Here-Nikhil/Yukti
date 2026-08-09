import { motion } from "framer-motion";
import { useState } from "react";
import { Key, ArrowRight } from "lucide-react";

interface ApiKeySetupProps {
  onComplete: (apiKey: string) => void;
  onBack: () => void;
}

const PROVIDERS = [
  { prefix: "gsk_", label: "Groq", color: "#22d3ee" },
  { prefix: "sk-ant-", label: "Anthropic", color: "#8b5cf6" },
  { prefix: "AIza", label: "Gemini", color: "#10b981" },
];

function detectProvider(key: string) {
  return PROVIDERS.find((p) => key.startsWith(p.prefix)) ?? null;
}

export function ApiKeySetup({ onComplete, onBack }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  const provider = detectProvider(apiKey.trim());
  const valid = !!provider;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onComplete(apiKey.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "#0d0b14" }}
    >
      {/* Cyan glow blob */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.12), transparent 70%)",
          top: "10%",
          right: "10%",
          pointerEvents: "none",
        }}
      />
      {/* Purple glow blob */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)",
          bottom: "10%",
          left: "10%",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 22 }}
        style={{
          background: "rgba(15, 10, 30, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          borderRadius: 20,
          padding: "2.5rem",
          width: "100%",
          maxWidth: 460,
          margin: "0 1.5rem",
          color: "#f1f0f5",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(34, 211, 238, 0.12)",
            marginBottom: "1.25rem",
          }}
        >
          <Key size={20} color="#22d3ee" />
        </div>

        <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Connect your AI
        </div>
        <p style={{ fontSize: "0.875rem", color: "rgba(241,240,245,0.55)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
          Yukti uses your own API key — your key, your usage, your control. Supports Groq, Anthropic, and Gemini.
        </p>

        {/* Supported providers */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {PROVIDERS.map((p) => (
            <div
              key={p.prefix}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "0.4rem 0.5rem",
                borderRadius: 8,
                border: `1px solid ${provider?.prefix === p.prefix ? p.color : "rgba(255,255,255,0.08)"}`,
                background: provider?.prefix === p.prefix ? `${p.color}18` : "transparent",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: provider?.prefix === p.prefix ? p.color : "rgba(241,240,245,0.35)",
                transition: "all 300ms ease",
                letterSpacing: "0.05em",
              }}
            >
              {p.label}
            </div>
          ))}
        </div>

        {/* Input */}
        <label style={{ fontSize: "0.75rem", color: "rgba(241,240,245,0.45)", fontWeight: 500, letterSpacing: "0.06em" }}>
          API KEY
        </label>
        <input
          autoFocus
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="gsk_... or sk-ant-... or AIza..."
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.4rem",
            marginBottom: "0.6rem",
            padding: "0.65rem 0.85rem",
            borderRadius: 10,
            border: `1px solid ${valid ? (provider?.color ?? "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.12)"}`,
            background: "rgba(255,255,255,0.05)",
            color: "#f1f0f5",
            fontSize: "0.875rem",
            outline: "none",
            transition: "border 300ms ease",
            boxSizing: "border-box",
            fontFamily: "monospace",
          }}
        />

        {valid && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: "0.78rem", color: provider?.color, marginBottom: "1rem" }}
          >
            ✓ {provider?.label} key detected
          </motion.p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: "0.5rem" }}>
          <button
            onClick={onBack}
            style={{
              flex: "0 0 auto",
              padding: "0.65rem 1.1rem",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(241,240,245,0.5)",
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "color 200ms ease",
            }}
          >
            ← Back
          </button>
          <button
            onClick={submit}
            disabled={!valid || busy}
            style={{
              flex: 1,
              padding: "0.65rem 1.1rem",
              borderRadius: 10,
              border: "none",
              background: valid ? "#22d3ee" : "rgba(255,255,255,0.08)",
              color: valid ? "#0d0b14" : "rgba(241,240,245,0.3)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: valid ? "pointer" : "not-allowed",
              transition: "all 300ms ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: valid ? "0 0 24px rgba(34,211,238,0.3)" : "none",
            }}
          >
            {busy ? "Saving…" : "Start with Auto"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </div>

        <p style={{ fontSize: "0.72rem", color: "rgba(241,240,245,0.25)", marginTop: "1.25rem", textAlign: "center", lineHeight: 1.5 }}>
          Your key is stored encrypted in your account. Never shared.
        </p>
      </motion.div>
    </motion.div>
  );
}

export default ApiKeySetup;