"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, CircleSlash, ThumbsDown, Wrench } from "lucide-react";
import { api, ApiError, getClientId, timeAgo } from "@/lib/client";
import { CONFIRM_THRESHOLD, DISPUTE_THRESHOLD, RESOLVE_THRESHOLD } from "@/lib/reports";
import type { PublicReport } from "@/app/api/barriers/public";
import { CategoryLabel, OriginTag, SeverityPill, StatusBadge } from "./Badges";
import { useApp } from "./Providers";

interface Props {
  report: PublicReport;
  onUpdated?: (r: PublicReport) => void;
  compact?: boolean;
  headingLevel?: 2 | 3;
}

export function ReportDetail({ report, onUpdated, compact, headingLevel = 3 }: Props) {
  const { t, L, lang } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState(false);
  const H = headingLevel === 2 ? "h2" : "h3";

  useEffect(() => {
    setMsg(null);
    setPhoto(null);
    setPhotoErr(false);
  }, [report.id]);

  async function act(action: "confirm" | "dispute" | "resolve") {
    setBusy(action);
    setMsg(null);
    try {
      const res = await api<{ report: PublicReport }>(`/api/barriers/${report.id}/actions`, {
        method: "POST",
        json: { action, clientId: getClientId() },
      });
      onUpdated?.(res.report);
      setMsg({ kind: "ok", text: L("Thanks — your response was recorded.", "நன்றி — உங்கள் பதில் பதிவு செய்யப்பட்டது.") });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiError ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function loadPhoto() {
    try {
      const res = await api<{ url: string }>(`/api/barriers/${report.id}/photo`);
      setPhoto(res.url);
    } catch {
      setPhotoErr(true);
    }
  }

  const tl = report.tallies;
  return (
    <article aria-labelledby={`r-${report.id}-h`} className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <H id={`r-${report.id}-h`} className="text-lg font-bold leading-snug">
          <CategoryLabel category={report.category} />
        </H>
        <OriginTag origin={report.origin} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={report.status} stale={report.freshness.stale} />
        <SeverityPill severity={report.severity} />
      </div>
      {report.description && <p className="text-[15px] text-navy-700">{report.description}</p>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[15px]">
        <dt className="text-mute">{t("reported")}</dt>
        <dd className="font-bold">{timeAgo(report.createdAt, lang)}</dd>
        <dt className="text-mute">{t("lastVerified")}</dt>
        <dd className="font-bold">{timeAgo(report.lastVerifiedAt, lang)}</dd>
        {report.ai && (
          <>
            <dt className="text-mute">{t("confidence")}</dt>
            <dd className="font-bold">
              {Math.round(report.ai.confidence * 100)}%{" "}
              {report.ai.isDemo && <span className="font-normal text-amber">({L("demo, simulated", "மாதிரி, போலி")})</span>}
              {report.userCorrectedAi && <span className="block font-normal text-mute">{L("Corrected by reporter", "பதிவாளர் திருத்தினார்")}</span>}
            </dd>
          </>
        )}
      </dl>

      {report.freshness.stale && report.status !== "resolved" && (
        <p className="rounded-xl bg-mute-100 px-3 py-2 text-[15px]">
          <span aria-hidden="true">⌛ </span>
          {t("stale")}{" "}
          {report.freshness.halfLifeDays !== null &&
            L(`(temporary barriers of this type are re-checked every ${report.freshness.halfLifeDays} days)`, `(இவ்வகை தற்காலிகத் தடைகள் ${report.freshness.halfLifeDays} நாட்களுக்கு ஒருமுறை சரிபார்க்கப்படும்)`)}
        </p>
      )}

      {report.hasPhoto && !compact && (
        <div>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={L("Photo submitted with this report", "இந்தப் பதிவுடன் அனுப்பப்பட்ட புகைப்படம்")} className="max-h-64 w-full rounded-xl object-cover" />
          ) : (
            <button type="button" className="btn-ghost text-[15px]" onClick={loadPhoto}>
              <Camera className="h-5 w-5" aria-hidden="true" /> {L("Show photo", "புகைப்படம் காட்டு")}
            </button>
          )}
          {photoErr && <p className="text-[15px] text-danger">{L("Photo unavailable.", "புகைப்படம் கிடைக்கவில்லை.")}</p>}
        </div>
      )}

      <div>
        <p className="mb-2 text-[15px] font-bold">{L("Have you been here recently?", "சமீபத்தில் இங்கு சென்றீர்களா?")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" className="btn-secondary px-3 text-[15px]" disabled={!!busy} onClick={() => act("confirm")}>
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            {t("confirm")}
          </button>
          <button type="button" className="btn-secondary px-3 text-[15px]" disabled={!!busy || report.status === "resolved"} onClick={() => act("dispute")}>
            <ThumbsDown className="h-5 w-5" aria-hidden="true" />
            {t("dispute")}
          </button>
          <button type="button" className="btn-secondary px-3 text-[15px]" disabled={!!busy || report.status === "resolved"} onClick={() => act("resolve")}>
            <Wrench className="h-5 w-5" aria-hidden="true" />
            {t("resolve")}
          </button>
        </div>
        <p className="mt-2 text-sm text-mute">
          {report.status === "resolved"
            ? L("Marked resolved. “Still there” re-opens it for verification.", "சரிசெய்யப்பட்டது. “இன்னும் உள்ளது” அழுத்தினால் மீண்டும் சரிபார்ப்புக்குத் திறக்கும்.")
            : L(
                `Since last status change: ${tl.confirms}/${CONFIRM_THRESHOLD} confirmations · ${tl.disputes}/${DISPUTE_THRESHOLD} disputes · ${tl.resolves}/${RESOLVE_THRESHOLD} “fixed”`,
                `கடைசி நிலை மாற்றத்திலிருந்து: ${tl.confirms}/${CONFIRM_THRESHOLD} உறுதிப்படுத்தல் · ${tl.disputes}/${DISPUTE_THRESHOLD} மறுப்பு · ${tl.resolves}/${RESOLVE_THRESHOLD} “சரிசெய்யப்பட்டது”`,
              )}
        </p>
        <div aria-live="polite">
          {msg && (
            <p className={`mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-[15px] ${msg.kind === "ok" ? "bg-ok-100 text-ok" : "bg-danger-100 text-danger"}`}>
              {msg.kind === "err" && <CircleSlash className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
