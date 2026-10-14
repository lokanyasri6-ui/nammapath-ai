/** Logo mark: a footpath line with tactile-paving dots — the site's visual motif. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="#13263D" />
      <path d="M9 31 C 15 31, 14 20, 20 20 S 26 9, 31 9" stroke="#2DD4BF" strokeWidth="4" fill="none" strokeLinecap="round" />
      {[[10, 12], [16, 12], [10, 18], [28, 26], [28, 32], [34, 26]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill="#F4C55A" />
      ))}
    </svg>
  );
}
