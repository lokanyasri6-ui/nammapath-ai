"use client";

import { CATEGORIES, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/categories";
import type { CategoryId, ReportStatus, Severity } from "@/lib/types";
import { useApp } from "./Providers";

export const STATUS_STYLE: Record<ReportStatus, string> = {
  pending: "bg-amber-100 text-[#7A3A06] ring-1 ring-amber/40",
  confirmed: "bg-danger-100 text-danger ring-1 ring-danger/30",
  disputed: "bg-[#EEE8FA] text-[#5B3A9E] ring-1 ring-[#5B3A9E]/30",
  resolved: "bg-ok-100 text-ok ring-1 ring-ok/30",
};

/** Status is always shown as glyph + text, never colour alone. */
export function StatusBadge({ status, stale }: { status: ReportStatus; stale?: boolean }) {
  const { L } = useApp();
  const s = STATUS_LABELS[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`chip ${STATUS_STYLE[status]}`} title={L(s.explain, s.explainTa)}>
        <span aria-hidden="true" className="font-mono">{s.glyph}</span>
        {L(s.en, s.ta)}
      </span>
      {stale && status !== "resolved" && (
        <span className="chip bg-mute-100 text-navy-700 ring-1 ring-navy/15">
          <span aria-hidden="true">⌛</span>
          {L("May be outdated", "பழையதாக இருக்கலாம்")}
        </span>
      )}
    </span>
  );
}

export function CategoryLabel({ category, className = "" }: { category: CategoryId; className?: string }) {
  const { L } = useApp();
  const c = CATEGORIES[category];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy text-[15px] text-white">{c.glyph}</span>
      <span>{L(c.en, c.ta)}</span>
    </span>
  );
}

export function SeverityPill({ severity }: { severity: Severity }) {
  const { L } = useApp();
  const s = SEVERITY_LABELS[severity];
  const bars = { low: 1, medium: 2, high: 3, impassable: 4 }[severity];
  return (
    <span className="chip bg-mute-100 text-navy" title={L(s.hint, s.hintTa)}>
      <span aria-hidden="true" className="flex items-end gap-[2px]">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`w-[4px] rounded-sm ${i <= bars ? "bg-navy" : "bg-navy/20"}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      {L(s.en, s.ta)}
    </span>
  );
}

export function OriginTag({ origin }: { origin: "synthetic_demo" | "community" | "verified_survey" }) {
  const { t, L } = useApp();
  if (origin === "synthetic_demo")
    return <span className="chip bg-amber-100 text-[#7A3A06] ring-1 ring-amber/40 tactile-amber">{t("syntheticTag")}</span>;
  if (origin === "verified_survey") return <span className="chip bg-ok-100 text-ok">{L("Verified survey", "சரிபார்க்கப்பட்ட ஆய்வு")}</span>;
  return <span className="chip bg-teal-50 text-teal-700">{t("communityTag")}</span>;
}
