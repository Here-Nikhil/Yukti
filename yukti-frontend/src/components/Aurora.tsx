export function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="aurora-blob"
        style={{
          width: "50rem",
          height: "50rem",
          top: "-15rem",
          left: "-10rem",
          background: "var(--color-aurora-1)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: "42rem",
          height: "42rem",
          top: "20%",
          right: "-12rem",
          background: "var(--color-aurora-2)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: "38rem",
          height: "38rem",
          bottom: "-16rem",
          left: "30%",
          background: "var(--color-aurora-3)",
          animationDelay: "-12s",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, transparent 40%, var(--color-background) 80%)",
        }}
      />
    </div>
  );
}
