"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageOff, Loader2, LocateFixed, Sparkles, TriangleAlert } from "lucide-react";
import { api, ApiError, checkImageFile, getClientId, reencodeImage } from "@/lib/client";
import { CATEGORIES, guessCategoryFromText, SEVERITY_LABELS } from "@/lib/categories";
import { CATEGORY_IDS, SEVERITIES, type AiResult, type CategoryId, type Graph, type Severity } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import { useApp } from "@/components/Providers";
import { VoiceInput } from "@/components/VoiceInput";
import { ReportDetail } from "@/components/ReportDetail";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[300px] place-items-center rounded-2xl bg-mute-100 text-mute">Loading map…</div>,
});

type AiState = { kind: "idle" } | { kind: "loading" } | { kind: "done"; result: AiResult } | { kind: "error"; message: string };

export default function ReportPageClient() {
  const { t, L, lang } = useApp();
  const params = useSearchParams();

  const [graph, setGraph] = useState<Graph | null>(null);
  const [graphErr, setGraphErr] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");
  const [ai, setAi] = useState<AiState>({ kind: "idle" });
  const [aiAccepted, setAiAccepted] = useState(false);

  const [point, setPoint] = useState<[number, number] | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [description, setDescription] = useState("");
  const [voiceGuess, setVoiceGuess] = useState<CategoryId | null>(null);

  const [errors, setErrors] = useState<Partial<Record<"location" | "category" | "severity", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [created, setCreated] = useState<PublicReport | null>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFile = useRef<File | null>(null);

  useEffect(() => {
    api<{ graph: Graph }>("/api/graph").then((g) => setGraph(g.graph)).catch(() => setGraphErr(true));
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) setPoint([lat, lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFile(file: File | undefined) {
    setPhotoErr("");
    setAi({ kind: "idle" });
    setAiAccepted(false);
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) {
      setPhotoErr(problem);
      return;
    }
    try {
      const { blob, dataUrl } = await reencodeImage(file);
      setPreview(dataUrl);
      setPhotoDataUrl(dataUrl);
      lastFile.current = file;
      await analyse(blob, file.name);
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function analyse(blob: Blob, fileName: string) {
    setAi({ kind: "loading" });
    const fd = new FormData();
    fd.append("photo", new File([blob], fileName.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
    fd.append("description", description);
    try {
      const result = await api<AiResult>("/api/classify", { method: "POST", body: fd });
      setAi({ kind: "done", result });
      // Pre-fill only when the model is reasonably confident; otherwise the human decides.
      if (!result.prediction.needsHumanReview && result.prediction.category !== "no_barrier_visible") {
        setCategory(result.prediction.category);
        setSeverity(result.prediction.severity);
        setAiAccepted(true);
      }
    } catch (e) {
      setAi({ kind: "error", message: e instanceof ApiError ? e.message : t("aiFailed") });
    }
  }

  function useSuggestion() {
    if (ai.kind !== "done") return;
    const p = ai.result.prediction;
    if (p.category !== "no_barrier_visible") setCategory(p.category);
    setSeverity(p.severity);
    setAiAccepted(true);
  }

  function locate() {
    setGeoMsg("");
    if (!("geolocation" in navigator)) { setGeoMsg(t("locDenied")); return; }
    setGeoMsg(t("locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPoint([pos.coords.latitude, pos.coords.longitude]); setGeoMsg(t("locationSet")); },
      () => setGeoMsg(L("Location unavailable — please tap the map instead.", "இருப்பிடம் கிடைக்கவில்லை — வரைபடத்தில் தட்டவும்.")),
      { timeout: 10_000 },
    );
  }

  function onVoice(text: string) {
    setDescription((d) => (d ? d + " " : "") + text);
    setVoiceGuess(guessCategoryFromText(text));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!point) errs.location = t("errLocation");
    if (!category) errs.category = t("errCategory");
    if (!severity) errs.severity = t("errSeverity");
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => errorSummary.current?.focus(), 0);
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const p = ai.kind === "done" ? ai.result : null;
      const res = await api<{ report: PublicReport }>("/api/barriers", {
        method: "POST",
        json: {
          lat: point![0],
          lng: point![1],
          category,
          severity,
          description: description.trim(),
          clientId: getClientId(),
          language: lang,
          photo: photoDataUrl,
          ai: p
            ? {
                category: p.prediction.category,
                severity: p.prediction.severity,
                confidence: p.prediction.confidence,
                explanation: p.prediction.explanation,
                uncertainty: p.prediction.uncertainty,
                provider: p.provider,
                isDemo: p.isDemo,
              }
            : null,
        },
      });
      setCreated(res.report);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitErr(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const outside = useMemo(() => {
    if (!point || !graph) return false;
    const lats = graph.nodes.map((n) => n.lat);
    const lngs = graph.nodes.map((n) => n.lng);
    return point[0] < Math.min(...lats) - 0.003 || point[0] > Math.max(...lats) + 0.003 || point[1] < Math.min(...lngs) - 0.003 || point[1] > Math.max(...lngs) + 0.003;
  }, [point, graph]);

  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div role="status" className="card grid gap-4 border-ok/40">
          <p className="flex items-center gap-2 text-xl font-bold text-ok">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> {t("submitted")}
          </p>
          <p>{t("submittedNext")}</p>
          {created.segmentId === null && (
            <p className="rounded-xl bg-amber-100 p-3 text-[15px]">
              {L("This location is not on a mapped footpath segment, so it will appear on the map but won't change routes yet.", "இந்த இடம் வரைபட நடைபாதையில் இல்லை; வரைபடத்தில் தெரியும், ஆனால் வழிகளை இன்னும் மாற்றாது.")}
            </p>
          )}
          <div className="rounded-xl border border-navy/10 p-4">
            <ReportDetail report={{ ...created, isMine: true }} onUpdated={setCreated} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/map" className="btn-primary">{t("navMap")}</Link>
            <Link href="/reports" className="btn-secondary">{t("navReports")}</Link>
            <button type="button" className="btn-ghost" onClick={() => window.location.assign("/report")}>{L("Report another", "மற்றொன்றைப் பதிவு செய்")}</button>
          </div>
        </div>
      </div>
    );
  }

  const errCount = Object.keys(errors).length;
  const pred = ai.kind === "done" ? ai.result.prediction : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p className="eyebrow">{L("Community reporting", "சமூகப் பதிவு")}</p>
      <h1 className="text-3xl font-bold">{t("reportTitle")}</h1>
      <p className="mt-2 max-w-3xl text-navy-700">{t("reportIntro")}</p>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-2" aria-describedby="report-privacy">
        {errCount > 0 && (
          <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-danger bg-danger-100/60 p-4 lg:col-span-2">
            <p className="font-bold text-danger">{L(`Please fix ${errCount} problem(s):`, `${errCount} பிழை(களை) சரிசெய்யவும்:`)}</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.location && <li><a href="#loc-h" className="underline">{errors.location}</a></li>}
              {errors.category && <li><a href="#cat-legend" className="underline">{errors.category}</a></li>}
              {errors.severity && <li><a href="#sev-legend" className="underline">{errors.severity}</a></li>}
            </ul>
          </div>
        )}

        {/* ---------- photo + AI ---------- */}
        <section aria-labelledby="photo-h" className="card grid content-start gap-4">
          <h2 id="photo-h" className="text-xl font-bold">{t("stepPhoto")}</h2>
          <div>
            <input
              ref={fileRef}
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              aria-describedby="photo-help"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <label htmlFor="photo" className="btn-secondary w-full cursor-pointer has-[:focus-visible]:outline">
              <Camera className="h-5 w-5" aria-hidden="true" /> {t("choosePhoto")}
            </label>
            <p id="photo-help" className="mt-2 text-sm text-mute">{t("photoHelp")}</p>
            {photoErr && <p role="alert" className="mt-2 flex items-center gap-2 font-bold text-danger"><ImageOff className="h-5 w-5" aria-hidden="true" />{photoErr}</p>}
          </div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={L("Preview of the photo you selected", "நீங்கள் தேர்ந்தெடுத்த புகைப்படத்தின் முன்னோட்டம்")} className="max-h-72 w-full rounded-xl object-cover" />
          )}

          <div aria-live="polite" aria-busy={ai.kind === "loading"}>
            {ai.kind === "loading" && (
              <p className="flex items-center gap-2 rounded-xl bg-mute-100 p-3 font-bold">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {t("analysing")}
              </p>
            )}
            {ai.kind === "error" && (
              <div className="rounded-xl bg-amber-100 p-3">
                <p className="flex items-center gap-2 font-bold"><TriangleAlert className="h-5 w-5" aria-hidden="true" />{ai.message}</p>
                <p className="text-[15px]">{t("aiFailed")}</p>
              </div>
            )}
            {ai.kind === "done" && pred && (
              <div className={`rounded-2xl border-2 p-4 ${ai.result.isDemo ? "border-amber/60 bg-amber-100/40" : "border-teal/40 bg-teal-50"}`}>
                <p className="flex items-center gap-2 font-bold">
                  <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
                  {t("aiSuggestion")}
                  <span className="text-sm font-normal text-mute">({ai.result.isDemo ? "demo" : `${ai.result.provider} · ${ai.result.model}`})</span>
                </p>
                {ai.result.isDemo && <p className="mt-1 rounded-lg bg-amber-100 px-2 py-1 text-sm font-bold text-[#7A3A06]">{t("aiDemoNotice")}</p>}
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
                  <dt className="text-mute">{t("category")}</dt>
                  <dd className="font-bold">
                    {pred.category === "no_barrier_visible" ? L("No barrier recognised", "தடை எதுவும் கண்டறியப்படவில்லை") : L(CATEGORIES[pred.category].en, CATEGORIES[pred.category].ta)}
                  </dd>
                  <dt className="text-mute">{t("severity")}</dt>
                  <dd className="font-bold">{L(SEVERITY_LABELS[pred.severity].en, SEVERITY_LABELS[pred.severity].ta)}</dd>
                  <dt className="text-mute">{t("confidence")}</dt>
                  <dd className="font-bold">{Math.round(pred.confidence * 100)}%</dd>
                </dl>
                <p className="mt-2 text-[15px]"><strong>{L("Evidence:", "ஆதாரம்:")}</strong> {pred.explanation}</p>
                {pred.uncertainty && <p className="text-[15px]"><strong>{L("Uncertainty:", "நிச்சயமின்மை:")}</strong> {pred.uncertainty}</p>}
                {pred.needsHumanReview && <p className="mt-2 rounded-lg bg-white p-2 text-[15px] font-bold text-[#7A3A06]">⚠ {t("humanReview")}</p>}
                {ai.result.policyNotes.map((n) => <p key={n} className="text-sm text-mute">{n}</p>)}
                {!aiAccepted && pred.category !== "no_barrier_visible" && (
                  <button type="button" className="btn-secondary mt-3" onClick={useSuggestion}>{t("useSuggestion")}</button>
                )}
                {aiAccepted && <p className="mt-2 text-[15px] text-teal-700">{L("Suggestion applied below — please check it and change anything that's wrong.", "பரிந்துரை கீழே பயன்படுத்தப்பட்டது — சரிபார்த்துத் திருத்தவும்.")}</p>}
              </div>
            )}
          </div>
          <p className="text-sm text-mute">{L("No photo? You can still submit a report by filling in the details manually.", "புகைப்படம் இல்லையா? விவரங்களை நிரப்பிப் பதிவு செய்யலாம்.")}</p>
          <div className="rounded-xl bg-mute-100 p-3">
            <p className="text-sm font-bold">{L("Demo: try an illustrative sample image", "மாதிரி: விளக்கப் படத்தை முயற்சிக்கவும்")}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                ["stairs-footbridge.jpg", L("Stairs", "படிகள்")],
                ["waterlogged-road.jpg", L("Flooding", "வெள்ளம்")],
                ["construction-debris.jpg", L("Debris", "குப்பை")],
              ].map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  className="group grid gap-1 rounded-lg text-left text-sm font-bold"
                  onClick={async () => {
                    const blob = await fetch(`/samples/${f}`).then((r) => r.blob());
                    onFile(new File([blob], f, { type: "image/jpeg" }));
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/samples/${f}`} alt="" className="aspect-[3/2] w-full rounded-lg object-cover ring-2 ring-transparent group-hover:ring-teal" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-mute">{L("Computer-drawn illustrations, not real locations.", "கணினி வரைந்த படங்கள்; உண்மையான இடங்கள் அல்ல.")}</p>
          </div>
        </section>

        {/* ---------- location ---------- */}
        <section aria-labelledby="loc-h" className="card grid content-start gap-3">
          <h2 id="loc-h" tabIndex={-1} className="text-xl font-bold">{t("stepLocation")}</h2>
          <p id="loc-help" className="text-[15px] text-navy-700">{t("pickOnMap")}</p>
          <div className={`h-[340px] ${errors.location ? "rounded-2xl ring-4 ring-danger/40" : ""}`}>
            {graph ? (
              <MapView
                center={point ?? graph.center}
                nodes={graph.nodes}
                segments={graph.segments}
                picked={point}
                onPick={(lat, lng) => { setPoint([lat, lng]); setErrors((e) => ({ ...e, location: undefined })); }}
                ariaLabel={L("Map: click or tap to set the barrier location", "வரைபடம்: தடையின் இடத்தைக் குறிக்கத் தட்டவும்")}
                className="h-full"
              />
            ) : graphErr ? (
              <div className="grid h-full place-items-center rounded-2xl bg-mute-100 p-4 text-center text-mute">{L("Map unavailable. Use “Use my location” instead.", "வரைபடம் கிடைக்கவில்லை.")}</div>
            ) : (
              <div className="grid h-full place-items-center rounded-2xl bg-mute-100 text-mute">{t("loading")}</div>
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={locate}>
            <LocateFixed className="h-5 w-5" aria-hidden="true" /> {L("Use my current location", "என் தற்போதைய இருப்பிடம்")}
          </button>
          <p role="status" aria-live="polite" className="text-[15px]">
            {point ? <span className="font-bold text-teal-700">✓ {t("locationSet")}: {point[0].toFixed(5)}, {point[1].toFixed(5)}</span> : geoMsg}
          </p>
          {point && geoMsg && <p className="text-sm text-mute">{geoMsg}</p>}
          {outside && <p className="rounded-xl bg-amber-100 p-3 text-[15px]">{L("This point is outside the pilot area. The report will be stored but won't affect routes.", "இந்த இடம் முன்னோட்டப் பகுதிக்கு வெளியே உள்ளது.")}</p>}
          {errors.location && <p className="font-bold text-danger">{errors.location}</p>}
        </section>

        {/* ---------- details ---------- */}
        <section aria-labelledby="det-h" className="card grid gap-5 lg:col-span-2">
          <h2 id="det-h" className="text-xl font-bold">{t("stepDetails")}</h2>

          <fieldset aria-describedby={errors.category ? "cat-err" : undefined}>
            <legend id="cat-legend" tabIndex={-1} className="label text-base">{t("category")} <span aria-hidden="true" className="text-danger">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORY_IDS.map((id) => (
                <label key={id} className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-teal ${category === id ? "border-teal bg-teal-50" : "border-navy/15 hover:border-navy/30"}`}>
                  <input type="radio" name="category" value={id} checked={category === id} onChange={() => { setCategory(id); setErrors((e) => ({ ...e, category: undefined })); }} className="h-5 w-5 accent-teal" aria-invalid={!!errors.category} />
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy text-white">{CATEGORIES[id].glyph}</span>
                  <span className="font-bold leading-tight">{L(CATEGORIES[id].en, CATEGORIES[id].ta)}</span>
                  {pred && pred.category === id && <span className="ml-auto chip bg-teal-100 text-teal-700">AI</span>}
                </label>
              ))}
            </div>
            {errors.category && <p id="cat-err" className="mt-1 font-bold text-danger">{errors.category}</p>}
          </fieldset>

          <fieldset aria-describedby={errors.severity ? "sev-err" : "sev-help"}>
            <legend id="sev-legend" tabIndex={-1} className="label text-base">{t("severity")} <span aria-hidden="true" className="text-danger">*</span></legend>
            <p id="sev-help" className="mb-2 text-sm text-mute">{L("Judge it for someone using a wheelchair.", "சக்கர நாற்காலி பயனரின் பார்வையில் மதிப்பிடவும்.")}</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {SEVERITIES.map((s) => (
                <label key={s} className={`flex min-h-[64px] cursor-pointer flex-col justify-center rounded-xl border-2 px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-teal ${severity === s ? "border-teal bg-teal-50" : "border-navy/15 hover:border-navy/30"}`}>
                  <span className="flex items-center gap-2 font-bold">
                    <input type="radio" name="severity" value={s} checked={severity === s} onChange={() => { setSeverity(s); setErrors((e) => ({ ...e, severity: undefined })); }} className="h-5 w-5 accent-teal" aria-invalid={!!errors.severity} />
                    {L(SEVERITY_LABELS[s].en, SEVERITY_LABELS[s].ta)}
                  </span>
                  <span className="text-sm text-mute">{L(SEVERITY_LABELS[s].hint, SEVERITY_LABELS[s].hintTa)}</span>
                </label>
              ))}
            </div>
            {errors.severity && <p id="sev-err" className="mt-1 font-bold text-danger">{errors.severity}</p>}
          </fieldset>

          <div>
            <label htmlFor="desc" className="label text-base">{t("description")}</label>
            <textarea id="desc" className="input min-h-[110px]" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} aria-describedby="desc-help" />
            <p id="desc-help" className="mt-1 text-sm text-mute">{L("Describe the barrier, not people. 500 characters max.", "தடையை விவரிக்கவும், நபர்களை அல்ல. அதிகபட்சம் 500 எழுத்துகள்.")} ({description.length}/500)</p>
            <div className="mt-2"><VoiceInput onText={onVoice} /></div>
            {voiceGuess && voiceGuess !== category && (
              <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 p-3 text-[15px]">
                {t("voiceGuess")} <strong>{L(CATEGORIES[voiceGuess].en, CATEGORIES[voiceGuess].ta)}</strong>
                <button type="button" className="btn-secondary min-h-[40px] px-3 py-1 text-sm" onClick={() => { setCategory(voiceGuess); setVoiceGuess(null); }}>
                  {L("Use this category", "இந்த வகையைப் பயன்படுத்து")}
                </button>
              </p>
            )}
          </div>

          <p id="report-privacy" className="text-sm text-mute">
            {L(
              "We don't ask for your name, phone number or any health information. An anonymous device ID is used only to stop duplicate votes.",
              "உங்கள் பெயர், தொலைபேசி எண் அல்லது உடல்நலத் தகவல் கேட்கப்படாது. நகல் வாக்குகளைத் தடுக்க மட்டும் அநாமதேய சாதன அடையாளம் பயன்படுத்தப்படும்.",
            )}
          </p>
          {submitErr && <p role="alert" className="rounded-xl bg-danger-100 p-3 font-bold text-danger">{submitErr}</p>}
          <div>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
              {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              {submitting ? t("submitting") : t("submit")}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
