"use client";

import { useState } from "react";
import { api, ApiError, getClientId } from "@/lib/client";
import { CATEGORIES, SEVERITY_LABELS } from "@/lib/categories";
import { CATEGORY_IDS, SEVERITIES, type CategoryId, type Severity } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import { useApp } from "./Providers";

/** Lets the original reporter confirm or correct the classification while the report is pending. */
export function ClassificationEditor({ report, onUpdated }: { report: PublicReport; onUpdated: (r: PublicReport) => void }) {
  const { L } = useApp();
  const [cat, setCat] = useState<CategoryId>(report.category);
  const [sev, setSev] = useState<Severity>(report.severity);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await api<{ report: PublicReport }>(`/api/barriers/${report.id}/classification`, {
        method: "PATCH",
        json: { category: cat, severity: sev, clientId: getClientId() },
      });
      onUpdated(res.report);
      setMsg(L("Classification saved.", "வகைப்பாடு சேமிக்கப்பட்டது."));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-teal/40 p-3">
      <p className="text-[15px] font-bold">{L("Your report — confirm or correct the classification", "உங்கள் பதிவு — வகைப்பாட்டை உறுதிசெய் / திருத்து")}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor={`ce-cat-${report.id}`} className="label">{L("Category", "வகை")}</label>
          <select id={`ce-cat-${report.id}`} className="input" value={cat} onChange={(e) => setCat(e.target.value as CategoryId)}>
            {CATEGORY_IDS.map((c) => <option key={c} value={c}>{L(CATEGORIES[c].en, CATEGORIES[c].ta)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`ce-sev-${report.id}`} className="label">{L("Severity", "தீவிரம்")}</label>
          <select id={`ce-sev-${report.id}`} className="input" value={sev} onChange={(e) => setSev(e.target.value as Severity)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{L(SEVERITY_LABELS[s].en, SEVERITY_LABELS[s].ta)}</option>)}
          </select>
        </div>
      </div>
      <button type="button" className="btn-secondary mt-2" onClick={save} disabled={busy}>{L("Save classification", "வகைப்பாட்டைச் சேமி")}</button>
      <p role="status" aria-live="polite" className="mt-1 text-sm">{msg}</p>
    </div>
  );
}
