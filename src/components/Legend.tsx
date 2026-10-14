"use client";

import { STATUS_LABELS } from "@/lib/categories";
import { useApp } from "./Providers";

export function MapLegend() {
  const { t, L } = useApp();
  const items: { key: keyof typeof STATUS_LABELS; style: string }[] = [
    { key: "pending", style: "border-[3px] border-dashed border-amber bg-white text-[#7A3A06]" },
    { key: "confirmed", style: "border-[3px] border-[#7A1A12] bg-danger text-white" },
    { key: "disputed", style: "border-[3px] border-dashed border-[#5B3A9E] bg-[#EEE8FA] text-[#5B3A9E]" },
    { key: "resolved", style: "border-[3px] border-ok bg-ok-100 text-ok" },
  ];
  return (
    <details className="card p-4 text-[15px]">
      <summary className="cursor-pointer font-bold">{t("legend")}</summary>
      <ul className="mt-3 grid gap-2">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3">
            <span aria-hidden="true" className={`grid h-7 w-7 place-items-center rounded-lg font-bold ${i.style}`}>{STATUS_LABELS[i.key].glyph}</span>
            <span><strong>{L(STATUS_LABELS[i.key].en, STATUS_LABELS[i.key].ta)}</strong> — {L(STATUS_LABELS[i.key].explain, STATUS_LABELS[i.key].explainTa)}</span>
          </li>
        ))}
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full border-2 border-navy bg-white text-xs">⌛</span>
          <span>{L("Stale: not re-verified recently — may be outdated", "பழையது: சமீபத்தில் சரிபார்க்கப்படவில்லை")}</span>
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="h-1.5 w-7 rounded bg-teal" />
          <span>{L("Best match for your profile (solid line)", "உங்கள் தேவைக்கு ஏற்ற வழி (முழுக் கோடு)")}</span>
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="h-0 w-7 border-t-[5px] border-dashed border-navy" />
          <span>{L("Shortest route (dashed line)", "குறுகிய வழி (இடைவெளிக் கோடு)")}</span>
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full border-2 border-navy bg-[#F4C55A] font-bold">?</span>
          <span>{L("Data check needed on this route", "இந்த வழியில் தரவுச் சரிபார்ப்பு தேவை")}</span>
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="h-1 w-7 rounded bg-danger/50" />
          <span>{L("Footpath segment with stairs only", "படிகள் மட்டுமே உள்ள பகுதி")}</span>
        </li>
      </ul>
    </details>
  );
}
