"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { api, ApiError, timeAgo } from "@/lib/client";
import { STATUS_LABELS } from "@/lib/categories";
import { STATUSES, type ReportStatus } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import { useApp } from "@/components/Providers";
import { CategoryLabel, OriginTag, SeverityPill, StatusBadge } from "@/components/Badges";

const ORDER: Record<ReportStatus, number> = { pending: 0, disputed: 1, confirmed: 2, resolved: 3 };

export default function ModerateClient() {
  const { L, lang, t } = useApp();
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [reports, setReports] = useState<PublicReport[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    try { const saved = sessionStorage.getItem("np.mod"); if (saved) setToken(saved); } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const res = await api<{ reports: PublicReport[] }>("/api/barriers");
      setReports(res.reports.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt)));
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Could not load reports.");
    }
  }, []);

  useEffect(() => { if (token) load(); }, [token, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    try {
      await api("/api/moderate", { headers: { "x-moderator-token": input } });
      setToken(input);
      try { sessionStorage.setItem("np.mod", input); } catch { /* ignore */ }
    } catch (err) {
      setLoginErr(err instanceof ApiError ? err.message : String(err));
    }
  }

  function logout() {
    setToken("");
    setReports(null);
    try { sessionStorage.removeItem("np.mod"); } catch { /* ignore */ }
  }

  async function setStatus(r: PublicReport, status: ReportStatus) {
    setRowMsg((m) => ({ ...m, [r.id]: "" }));
    try {
      const res = await api<{ report: PublicReport }>(`/api/moderate/${r.id}`, {
        method: "POST",
        headers: { "x-moderator-token": token },
        json: { status, note: notes[r.id] ?? "" },
      });
      setReports((rs) => rs?.map((x) => (x.id === r.id ? res.report : x)) ?? null);
      setRowMsg((m) => ({ ...m, [r.id]: L(`Status set to ${status}.`, `நிலை ${STATUS_LABELS[status].ta} என மாற்றப்பட்டது.`) }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      setRowMsg((m) => ({ ...m, [r.id]: e instanceof ApiError ? e.message : String(e) }));
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">{L("Moderator console", "நிர்வாகக் கட்டுப்பாடு")}</h1>
        <p className="mt-2 text-navy-700">{L("Review new reports, settle disputes and record decisions. Every change is logged in the report's history.", "புதிய பதிவுகளை மதிப்பாய்வு செய்யவும். ஒவ்வொரு மாற்றமும் பதிவாகும்.")}</p>
        <form onSubmit={login} className="card mt-5 grid gap-3">
          <label htmlFor="pin" className="label">{L("Moderator PIN", "நிர்வாகி PIN")}</label>
          <input id="pin" type="password" className="input" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="current-password" aria-describedby="pin-help" aria-invalid={!!loginErr} />
          <p id="pin-help" className="text-sm text-mute">{L("Demo mode PIN: demo-moderator. In production set MODERATOR_TOKEN on the server.", "மாதிரி முறை PIN: demo-moderator.")}</p>
          {loginErr && <p role="alert" className="font-bold text-danger">{loginErr}</p>}
          <button type="submit" className="btn-primary"><KeyRound className="h-5 w-5" aria-hidden="true" />{L("Sign in", "உள்நுழை")}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{L("Moderator console", "நிர்வாகக் கட்டுப்பாடு")}</h1>
        <button type="button" className="btn-secondary" onClick={logout}><LogOut className="h-5 w-5" aria-hidden="true" />{L("Sign out", "வெளியேறு")}</button>
      </div>
      <p className="mt-1 text-navy-700">{L("Pending and disputed reports are listed first.", "சரிபார்ப்பில் / சர்ச்சையில் உள்ளவை முதலில்.")}</p>
      {loadErr && <div role="alert" className="card mt-4 border-danger/40"><p className="font-bold text-danger">{loadErr}</p><button className="btn-secondary mt-2" type="button" onClick={load}>{t("retry")}</button></div>}
      {!reports && !loadErr && <p className="card mt-4 text-mute">{t("loading")}</p>}
      <ul className="mt-5 grid gap-4">
        {reports?.map((r) => (
          <li key={r.id} className="card grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="grid content-start gap-2">
              <h2 className="text-lg font-bold"><CategoryLabel category={r.category} /></h2>
              <div className="flex flex-wrap gap-2"><StatusBadge status={r.status} stale={r.freshness.stale} /><SeverityPill severity={r.severity} /><OriginTag origin={r.origin} /></div>
              {r.description && <p className="text-[15px]">{r.description}</p>}
              <p className="text-sm text-mute">
                {L("Created", "உருவாக்கம்")} {timeAgo(r.createdAt, lang)} · {L("votes since last change", "கடைசி மாற்றத்திலிருந்து வாக்குகள்")}: ✔ {r.tallies.confirms} · ✖ {r.tallies.disputes} · 🔧 {r.tallies.resolves}
                {r.ai && <> · AI {Math.round(r.ai.confidence * 100)}%{r.ai.isDemo ? " (demo)" : ""}{r.userCorrectedAi ? L(" · corrected by reporter", " · பதிவாளர் திருத்தினார்") : ""}</>}
              </p>
              <details>
                <summary className="cursor-pointer text-[15px] font-bold">{L("Status history", "நிலை வரலாறு")} ({r.history.length})</summary>
                <ol className="mt-2 grid gap-1 border-l-2 border-navy/15 pl-3 text-sm">
                  {r.history.map((h, i) => (
                    <li key={i}><strong>{h.from ? `${h.from} → ` : ""}{h.to}</strong> · {h.by} · {new Date(h.at).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")}<br /><span className="text-mute">{h.note}</span></li>
                  ))}
                </ol>
              </details>
            </div>
            <div className="grid content-start gap-2">
              <label htmlFor={`note-${r.id}`} className="label">{L("Decision note (logged)", "முடிவுக் குறிப்பு (பதிவாகும்)")}</label>
              <input id={`note-${r.id}`} className="input" maxLength={300} value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder={L("e.g. Checked on site visit", "எ.கா. நேரில் சரிபார்க்கப்பட்டது")} />
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => (
                  <button key={s} type="button" className="btn-secondary px-2 text-[15px]" disabled={s === r.status} onClick={() => setStatus(r, s)}>
                    <span aria-hidden="true" className="font-mono">{STATUS_LABELS[s].glyph}</span> {L(`Mark ${STATUS_LABELS[s].en.toLowerCase()}`, STATUS_LABELS[s].ta)}
                  </button>
                ))}
              </div>
              <p role="status" aria-live="polite" className="text-sm">{rowMsg[r.id]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
