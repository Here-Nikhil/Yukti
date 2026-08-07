export function YuktiLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="yl" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="oklch(0.75 0.22 295)" />
            <stop offset="1" stopColor="oklch(0.6 0.24 265)" />
          </linearGradient>
        </defs>
        <path
          d="M4 4 L16 18 L28 4 M16 18 L16 28"
          stroke="url(#yl)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">Yukti</span>
    </div>
  );
}
