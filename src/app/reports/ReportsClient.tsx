"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, ApiError, getClientId } from "@/lib/client";
import { CATEGORIES, STATUS_LABELS } from "@/lib/categories";
import { CATEGORY_IDS, STATUSES, type CategoryId, type ReportStatus } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import { useApp } from "@/components/Providers";
import { ReportDetail } from "@/components/ReportDetail";
import { ClassificationEditor } from "@/components/ClassificationEditor";

export default function ReportsClient() {
  const { t, L } = useApp();
  const [reports, setReports] = useState<PublicReport[] | null>(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [staleOnly, setStaleOnly] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    setReports(null);
    try {
      const res = await api<{ reports: PublicReport[] }>(`/api/barriers?viewer=${encodeURIComponent(getClientId())}`);
      setReports(res.reports);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not load reports.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (reports ?? []).filter(
    (r) => (status === "all" || r.status === status) && (category === "all" || r.category === category) && (!staleOnly || (r.freshness.stale && r.status !== "resolved")),
  );
  const update = (r: PublicReport) => setReports((rs) => rs?.map((x) => (x.id === r.id ? { ...x, ...r } : x)) ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p className="eyebrow">{L("Verify what you see", "நீங்கள் பார்ப்பதைச் சரிபார்க்கவும்")}</p>
      <h1 className="text-3xl font-bold">{t("reportsTitle")}</h1>

      <section aria-labelledby="policy-h" className="card mt-4 grid gap-2 tactile bg-[length:16px_16px]">
        <div className="rounded-xl bg-white/95 p-4">
          <h2 id="policy-h" className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />{t("policyTitle")}</h2>
          <ul className="mt-2 grid gap-1 text-[15px] sm:grid-cols-2">
            <li>• {L("Every new report starts as Pending — even if the AI is confident.", "ஒவ்வொரு புதிய பதிவும் “சரிபார்ப்பில்” தொடங்கும் — AI உறுதியாக இருந்தாலும்.")}</li>
            <li>• {L("Confirmed needs 2 independent “still there” responses (not the reporter), or a moderator.", "உறுதிசெய்ய 2 சுயாதீன “இன்னும் உள்ளது” பதில்கள் (பதிவாளர் அல்ல) அல்லது நிர்வாகி தேவை.")}</li>
            <li>• {L("Disputed after 2 “not accurate” responses that outnumber confirmations.", "2 “சரியல்ல” பதில்கள் உறுதிப்படுத்தல்களை விட அதிகமானால் சர்ச்சை.")}</li>
            <li>• {L("Resolved after 2 “it's fixed” responses, or a moderator. “Still there” re-opens it.", "2 “சரிசெய்யப்பட்டது” பதில்கள் / நிர்வாகி. “இன்னும் உள்ளது” மீண்டும் திறக்கும்.")}</li>
            <li>• {L("Temporary barriers go stale (flooding after 2 days, debris after 14) and ask for re-verification. Routing then treats them as uncertain.", "தற்காலிகத் தடைகள் பழையதாகும் (வெள்ளம் 2 நாள், குப்பை 14 நாள்); பின் நிச்சயமற்றவையாகக் கருதப்படும்.")}</li>
            <li>• {L("One vote per action per device. No accounts or personal data needed.", "ஒரு சாதனத்துக்கு ஒரு செயலுக்கு ஒரு வாக்கு. கணக்கு தேவையில்லை.")}</li>
          </ul>
        </div>
      </section>

      <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => e.preventDefault()} aria-label={L("Filter reports", "பதிவுகளை வடிகட்டு")}>
        <div>
          <label htmlFor="f-status" className="label">{t("status")}</label>
          <select id="f-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | "all")}>
            <option value="all">{t("all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{L(STATUS_LABELS[s].en, STATUS_LABELS[s].ta)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-cat" className="label">{t("category")}</label>
          <select id="f-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "all")}>
            <option value="all">{t("all")}</option>
            {CATEGORY_IDS.map((c) => <option key={c} value={c}>{L(CATEGORIES[c].en, CATEGORIES[c].ta)}</option>)}
          </select>
        </div>
        <label className="flex min-h-[48px] items-center gap-2 font-bold">
          <input type="checkbox" className="h-5 w-5 accent-teal" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
          {L("Needs re-verification", "மீண்டும் சரிபார்க்க வேண்டியவை")}
        </label>
      </form>

      <div aria-live="polite" aria-busy={reports === null && !err} className="mt-5">
        {err && (
          <div role="alert" className="card border-danger/40 bg-danger-100/50">
            <p className="font-bold text-danger">{err}</p>
            <button type="button" className="btn-secondary mt-2" onClick={load}>{t("retry")}</button>
          </div>
        )}
        {reports === null && !err && <p className="card text-mute">{t("loading")}</p>}
        {reports && <p className="mb-3 text-[15px] text-mute">{L(`${filtered.length} of ${reports.length} reports`, `${reports.length} இல் ${filtered.length} பதிவுகள்`)}</p>}
        {reports && filtered.length === 0 && <p className="card text-mute">{t("noReports")}</p>}
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.id} id={r.id} className="card grid gap-3">
              <ReportDetail report={r} onUpdated={update} headingLevel={2} />
              {r.isMine && r.status === "pending" && <ClassificationEditor report={r} onUpdated={update} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
