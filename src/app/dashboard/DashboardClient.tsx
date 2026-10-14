"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardCopy, FileText, MapPin } from "lucide-react";
import { api, ApiError, timeAgo } from "@/lib/client";
import { CATEGORIES, STATUS_LABELS } from "@/lib/categories";
import { civicSummary, type DashboardStats } from "@/lib/dashboard";
import type { Graph } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import { useApp } from "@/components/Providers";
import { CategoryLabel, StatusBadge } from "@/components/Badges";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-full rounded-2xl bg-mute-100" /> });

type Dash = Omit<DashboardStats, "recent" | "needsReverification"> & {
  recent: PublicReport[];
  needsReverification: PublicReport[];
  graphSource: "seed" | "database";
  storeMode: "memory" | "supabase";
};

const C_CREATED = "#00908A"; // validated pair (light surface): CVD ΔE 14.4, normal ΔE 23.3
const C_RESOLVED = "#C2620E";

function Tile({ label, value, note, emphasis }: { label: string; value: number | string; note?: string; emphasis?: boolean }) {
  return (
    <div className={`card ${emphasis ? "border-teal/40 bg-teal-50" : ""}`}>
      <p className="text-[15px] font-bold text-mute">{label}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-sm text-mute">{note}</p>}
    </div>
  );
}

function TrendChart({ data }: { data: Dash["trend"] }) {
  const { L } = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.resolved]));
  const H = 160;
  return (
    <figure className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-lg font-bold">{L("Reports created vs resolved, last 8 weeks", "கடந்த 8 வாரங்கள்: உருவான / சரிசெய்யப்பட்ட பதிவுகள்")}</figcaption>
        <button type="button" className="btn-ghost min-h-[40px] text-[15px]" aria-pressed={table} onClick={() => setTable((x) => !x)}>
          {table ? L("Show chart", "வரைபடம் காட்டு") : L("Show table", "அட்டவணை காட்டு")}
        </button>
      </div>
      <ul className="mt-2 flex gap-4 text-sm" aria-label={L("Legend", "குறிப்பு")}>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: C_CREATED }} />{L("Created", "உருவானவை")}</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: C_RESOLVED, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 2px, transparent 2px 5px)" }} />{L("Resolved", "சரிசெய்யப்பட்டவை")}</li>
      </ul>
      {table ? (
        <table className="mt-3 w-full text-left text-[15px]">
          <caption className="sr-only">{L("Weekly reports created and resolved", "வாராந்திரப் பதிவுகள்")}</caption>
          <thead><tr className="border-b border-navy/10"><th scope="col" className="py-1">{L("Week starting", "வாரம்")}</th><th scope="col">{L("Created", "உருவானவை")}</th><th scope="col">{L("Resolved", "சரிசெய்யப்பட்டவை")}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.weekStart} className="border-b border-navy/5"><td className="py-1">{d.weekStart}</td><td>{d.created}</td><td>{d.resolved}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="relative mt-3" onMouseLeave={() => setHover(null)}>
          <div className="flex items-end gap-2 border-b border-navy/20" style={{ height: H }} role="img" aria-label={L("Weekly created and resolved counts; use “Show table” for exact values.", "வாராந்திர எண்ணிக்கை; துல்லிய மதிப்புகளுக்கு அட்டவணையைப் பார்க்கவும்.")}>
            {data.map((d, i) => (
              <div key={d.weekStart} className="relative flex h-full flex-1 items-end justify-center gap-[2px]" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.weekStart}: ${d.created} created, ${d.resolved} resolved`}>
                <div className="w-[38%] max-w-[16px] rounded-t-[4px]" style={{ height: `${(d.created / max) * (H - 18)}px`, background: C_CREATED, minHeight: d.created ? 3 : 0 }} />
                <div className="w-[38%] max-w-[16px] rounded-t-[4px]" style={{ height: `${(d.resolved / max) * (H - 18)}px`, background: C_RESOLVED, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 2px, transparent 2px 5px)", minHeight: d.resolved ? 3 : 0 }} />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-sm text-white shadow">
                    <strong>{d.weekStart}</strong><br />{d.created} {L("created", "உருவானவை")} · {d.resolved} {L("resolved", "சரிசெய்யப்பட்டவை")}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2 text-xs text-mute">
            {data.map((d, i) => <span key={d.weekStart} className="flex-1 text-center">{i % 2 === 1 ? d.weekStart.slice(5) : ""}</span>)}
          </div>
        </div>
      )}
    </figure>
  );
}

export default function DashboardClient() {
  const { L, t, lang } = useApp();
  const [d, setD] = useState<Dash | null>(null);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState<{ id: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    try {
      const [dash, rs, g] = await Promise.all([
        api<Dash>("/api/dashboard"),
        api<{ reports: PublicReport[] }>("/api/barriers"),
        api<{ graph: Graph }>("/api/graph"),
      ]);
      setD(dash);
      setReports(rs.reports);
      setGraph(g.graph);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not load dashboard.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div role="alert" className="card border-danger/40 bg-danger-100/50"><p className="font-bold text-danger">{err}</p><button type="button" className="btn-secondary mt-2" onClick={load}>{t("retry")}</button></div>
      </div>
    );
  if (!d) return <p className="mx-auto max-w-6xl px-4 py-10 text-mute" aria-busy="true">{t("loading")}</p>;

  const isSynthetic = d.dataOrigin.synthetic > 0;
  const maxCat = Math.max(1, ...d.byCategory.map((c) => c.count));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <p className="eyebrow">{L("For volunteers, councillors and planners", "தன்னார்வலர்கள், கவுன்சிலர்கள், திட்டமிடுபவர்களுக்கு")}</p>
      <h1 className="text-3xl font-bold">{L("Community dashboard", "சமூகத் தகவல் பலகை")}</h1>
      <p className="mt-2 max-w-3xl rounded-xl bg-amber-100 p-3 text-[15px] text-[#7A3A06]">
        <strong>{L("Data source:", "தரவு மூலம்:")}</strong>{" "}
        {L(
          `${d.storeMode === "supabase" ? "live database" : "in-memory demo store"} · ${d.dataOrigin.synthetic} synthetic demo reports, ${d.dataOrigin.community} community reports, ${d.dataOrigin.verified} verified-survey reports. Figures below are computed from these records only — they are not real-world impact numbers.`,
          `${d.storeMode === "supabase" ? "நேரடி தரவுத்தளம்" : "தற்காலிக மாதிரி சேமிப்பு"} · ${d.dataOrigin.synthetic} மாதிரிப் பதிவுகள், ${d.dataOrigin.community} சமூகப் பதிவுகள். இவை உண்மையான தாக்க எண்கள் அல்ல.`,
        )}
      </p>

      <section aria-label={L("Totals", "மொத்தங்கள்")} className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label={L("Total reports", "மொத்தப் பதிவுகள்")} value={d.totals.all} />
        <Tile label={L("Confirmed active", "உறுதிசெய்யப்பட்ட செயலில்")} value={d.totals.confirmedActive} emphasis />
        <Tile label={L("Pending", "சரிபார்ப்பில்")} value={d.totals.pending} />
        <Tile label={L("Disputed", "சர்ச்சையில்")} value={d.totals.disputed} />
        <Tile label={L("Resolved", "சரிசெய்யப்பட்டவை")} value={d.totals.resolved} note={d.medianDaysToResolve !== null ? L(`median ${d.medianDaysToResolve} days to resolve`, `சராசரி ${d.medianDaysToResolve} நாட்கள்`) : undefined} />
        <Tile label={L("Need re-verification", "மீண்டும் சரிபார்க்க")} value={d.totals.stale} note={L("stale temporary barriers", "பழைய தற்காலிகத் தடைகள்")} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <figure className="card">
          <figcaption className="text-lg font-bold">{L("Most reported barrier types", "அதிகம் பதிவான தடை வகைகள்")}</figcaption>
          <ul className="mt-3 grid gap-3">
            {d.byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between gap-2 text-[15px]">
                  <span className="font-bold">{L(c.label, c.labelTa)}</span>
                  <span className="tabular-nums">{c.count} <span className="text-mute">({c.active} {L("open", "திறந்தவை")})</span></span>
                </div>
                <div className="mt-1 h-3 rounded-full bg-mute-100" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${(c.count / maxCat) * 100}%`, background: C_CREATED }} />
                </div>
              </li>
            ))}
            {d.byCategory.length === 0 && <li className="text-mute">{t("noReports")}</li>}
          </ul>
        </figure>
        <TrendChart data={d.trend} />
      </div>

      <section aria-labelledby="hot-h" className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="card">
          <h2 id="hot-h" className="text-lg font-bold">{L("Reports by location — hotspots", "இடவாரியான பதிவுகள் — முக்கிய இடங்கள்")}</h2>
          <p className="text-[15px] text-mute">{L("Footpath segments with the most open reports. Generate a ready-to-paste summary for a civic grievance — nothing is sent automatically.", "அதிக திறந்த பதிவுகள் உள்ள நடைபாதைகள். புகார் சுருக்கத்தை உருவாக்கலாம் — தானாக எதுவும் அனுப்பப்படாது.")}</p>
          <ol className="mt-3 grid gap-2">
            {d.hotspots.map((h, i) => (
              <li key={h.segmentId} className="rounded-xl border border-navy/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold"><span className="mr-2 text-mute">{i + 1}.</span><MapPin className="mr-1 inline h-4 w-4 text-teal-700" aria-hidden="true" />{h.name}</p>
                  <p className="text-[15px] tabular-nums">{h.active} {L("open", "திறந்தவை")} / {h.count} {L("total", "மொத்தம்")}</p>
                </div>
                <p className="mt-1 text-sm text-mute">{h.categories.map((c) => L(CATEGORIES[c].en, CATEGORIES[c].ta)).join(" · ")}</p>
                {h.active > 0 && (
                  <button type="button" className="btn-ghost mt-1 min-h-[40px] px-2 text-[15px] text-teal-700" onClick={() => { setCopied(false); setSummary({ id: h.segmentId, text: civicSummary(h, reports, isSynthetic) }); }} aria-expanded={summary?.id === h.segmentId}>
                    <FileText className="h-5 w-5" aria-hidden="true" /> {L("Draft civic complaint summary", "புகார் சுருக்கத்தை உருவாக்கு")}
                  </button>
                )}
                {summary?.id === h.segmentId && (
                  <div className="mt-2">
                    <label htmlFor={`sum-${i}`} className="label">{L("Summary (editable)", "சுருக்கம் (திருத்தலாம்)")}</label>
                    <textarea id={`sum-${i}`} className="input min-h-[180px] font-mono text-sm" defaultValue={summary.text} />
                    <button type="button" className="btn-secondary mt-2 text-[15px]" onClick={async () => { try { await navigator.clipboard.writeText((document.getElementById(`sum-${i}`) as HTMLTextAreaElement).value); setCopied(true); } catch { setCopied(false); } }}>
                      <ClipboardCopy className="h-5 w-5" aria-hidden="true" /> {copied ? t("copied") : L("Copy summary", "சுருக்கத்தை நகலெடு")}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="card grid content-start gap-2">
          <h2 className="text-lg font-bold">{L("Where reports are", "பதிவுகள் எங்கே")}</h2>
          <div className="h-[380px]">
            {graph && <MapView center={graph.center} nodes={graph.nodes} segments={graph.segments} reports={reports.filter((r) => r.status !== "resolved")} ariaLabel={L("Map of open reports", "திறந்த பதிவுகளின் வரைபடம்")} className="h-full" zoom={16} />}
          </div>
          <Link href="/reports" className="text-[15px] font-bold text-teal-700 underline underline-offset-4">{L("Open the full list to verify reports →", "சரிபார்க்க முழுப் பட்டியலைத் திற →")}</Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section aria-labelledby="recent-h" className="card">
          <h2 id="recent-h" className="text-lg font-bold">{L("Recently updated", "சமீபத்தில் புதுப்பிக்கப்பட்டவை")}</h2>
          <ul className="mt-2 grid gap-2">
            {d.recent.map((r) => (
              <li key={r.id} className="grid gap-1 border-b border-navy/5 pb-2 text-[15px]">
                <Link href={`/reports#${r.id}`} className="font-bold hover:underline"><CategoryLabel category={r.category} /></Link>
                <span className="flex flex-wrap items-center gap-2"><StatusBadge status={r.status} stale={r.freshness.stale} /><span className="text-sm text-mute">{timeAgo(r.updatedAt, lang)}</span></span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="stale-h" className="card">
          <h2 id="stale-h" className="text-lg font-bold">{L("Please re-verify", "மீண்டும் சரிபார்க்கவும்")}</h2>
          <p className="text-sm text-mute">{L("Temporary barriers that haven't been checked recently. They count as uncertain in routing.", "சமீபத்தில் சரிபார்க்கப்படாத தற்காலிகத் தடைகள்.")}</p>
          <ul className="mt-2 grid gap-2">
            {d.needsReverification.length === 0 && <li className="text-mute">{L("Nothing stale right now.", "தற்போது பழையவை இல்லை.")}</li>}
            {d.needsReverification.map((r) => (
              <li key={r.id} className="text-[15px]">
                <Link href={`/reports#${r.id}`} className="font-bold hover:underline">{L(CATEGORIES[r.category].en, CATEGORIES[r.category].ta)}</Link>
                <span className="block text-sm text-mute">{L(STATUS_LABELS[r.status].en, STATUS_LABELS[r.status].ta)} · {L("last verified", "கடைசி சரிபார்ப்பு")} {timeAgo(r.lastVerifiedAt, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="ai-h" className="card">
          <h2 id="ai-h" className="text-lg font-bold">{L("AI-assisted reporting", "AI உதவியுடன் பதிவு")}</h2>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1.5 text-[15px]">
            <dt>{L("Reports with an AI suggestion", "AI பரிந்துரையுடன்")}</dt><dd className="font-bold tabular-nums">{d.aiStats.withAi}</dd>
            <dt>{L("…of which simulated (demo)", "…அவற்றில் மாதிரி")}</dt><dd className="font-bold tabular-nums">{d.aiStats.demo}</dd>
            <dt>{L("Corrected by the reporter", "பதிவாளர் திருத்தியவை")}</dt><dd className="font-bold tabular-nums">{d.aiStats.corrected}</dd>
            <dt>{L("Average stated confidence", "சராசரி நம்பகத்தன்மை")}</dt><dd className="font-bold tabular-nums">{d.aiStats.avgConfidence !== null ? `${Math.round(d.aiStats.avgConfidence * 100)}%` : "—"}</dd>
          </dl>
          <p className="mt-2 text-sm text-mute">{L("Corrections show where the model disagrees with people on the ground — useful for evaluating the model, not proof of accuracy.", "திருத்தங்கள் மாதிரியின் தவறுகளைக் காட்டுகின்றன — துல்லியத்தின் சான்று அல்ல.")}</p>
        </section>
      </div>
    </div>
  );
}
