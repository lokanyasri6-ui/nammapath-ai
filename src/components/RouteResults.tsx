"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, ChevronDown, CircleHelp, Copy, Volume2, VolumeX } from "lucide-react";
import type { RouteOption, RouteResult } from "@/lib/routing";
import { CATEGORIES, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/categories";
import { PROFILES } from "@/lib/profiles";
import { useApp } from "./Providers";

interface Props {
  result: RouteResult;
  selected: number;
  onSelect: (i: number) => void;
  onOpenReport: (id: string) => void;
  shareUrl: string;
}

function ClaimBadge({ o }: { o: RouteOption }) {
  const { L } = useApp();
  if (o.violations.length)
    return (
      <span className="chip bg-danger-100 text-danger ring-1 ring-danger/30">
        <Ban className="h-4 w-4" aria-hidden="true" /> {L("Does not meet your needs", "உங்கள் தேவைக்குப் பொருந்தாது")}
      </span>
    );
  if (o.claim === "supported")
    return (
      <span className="chip bg-ok-100 text-ok ring-1 ring-ok/30">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {L("Supported by data", "தரவு ஆதரிக்கிறது")}
      </span>
    );
  if (o.claim === "uncertain")
    return (
      <span className="chip bg-amber-100 text-[#7A3A06] ring-1 ring-amber/40">
        <CircleHelp className="h-4 w-4" aria-hidden="true" /> {L("Partly unconfirmed", "பகுதியளவு உறுதியில்லை")}
      </span>
    );
  return null;
}

function ConfidenceMeter({ value }: { value: number }) {
  const { t } = useApp();
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">{t("dataConfidence")}</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-mute-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("dataConfidence")}>
        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RouteResults({ result, selected, onSelect, onOpenReport, shareUrl }: Props) {
  const { t, L, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsMsg, setTtsMsg] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const opt = result.options[selected];
  const profile = PROFILES[result.profile];

  useEffect(() => {
    headingRef.current?.focus();
  }, [result.computedAt]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);

  function speak() {
    if (!opt) return;
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      setTtsMsg(t("ttsUnavailable"));
      return;
    }
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const wantTa = lang === "ta";
    const voices = synth.getVoices();
    const taVoice = voices.find((v) => v.lang.toLowerCase().startsWith("ta"));
    const useTa = wantTa && !!taVoice;
    if (wantTa && !taVoice) setTtsMsg(L("", "இந்தச் சாதனத்தில் தமிழ் குரல் இல்லை — ஆங்கிலத்தில் படிக்கப்படுகிறது."));
    const text = [
      useTa ? opt.labelTa : opt.label,
      ...opt.instructions.map((i, n) => `${n + 1}. ${useTa ? i.textTa : i.text} ${i.warnings.length ? (useTa ? "எச்சரிக்கை: " : "Caution: ") + i.warnings.join(", ") : ""}`),
      useTa ? "இது பாதுகாப்பு உத்தரவாதம் அல்ல." : "This is not a safety guarantee.",
    ].join(". ");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = useTa ? "ta-IN" : "en-IN";
    if (useTa && taVoice) u.voice = taVoice;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  return (
    <section aria-labelledby="results-h" className="grid gap-4">
      <h2 id="results-h" ref={headingRef} tabIndex={-1} className="text-xl font-bold focus:outline-none">
        {t("routes")}{" "}
        <span className="block text-[15px] font-normal text-mute">
          {L(result.from.name, result.from.nameTa)} → {L(result.to.name, result.to.nameTa)} · {L(profile.en, profile.ta)}
        </span>
      </h2>

      {result.noRoute && (
        <div role="alert" className="rounded-2xl border-2 border-danger/40 bg-danger-100/60 p-4">
          <p className="flex items-center gap-2 font-bold text-danger">
            <Ban className="h-5 w-5" aria-hidden="true" /> {t("noRouteTitle")}
          </p>
          <p className="mt-1 text-[15px]">{result.noRoute.message}</p>
          {result.noRoute.blockers.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[15px]">
              {result.noRoute.blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}
          <p className="mt-2 text-[15px]">
            {L(
              "Know a step-free way in? Report it, or try another destination. Caregivers can use the comparison route below to plan assistance.",
              "படியில்லா வழி தெரிந்தால் பதிவு செய்யுங்கள். பராமரிப்பாளர்கள் கீழே உள்ள ஒப்பீட்டு வழியைப் பயன்படுத்தலாம்.",
            )}
          </p>
        </div>
      )}

      {result.options.length > 1 && (
        <div role="tablist" aria-label={t("routes")} className="grid grid-cols-2 gap-2">
          {result.options.map((o, i) => (
            <button
              key={o.kind}
              role="tab"
              type="button"
              aria-selected={i === selected}
              aria-controls={`route-panel-${i}`}
              id={`route-tab-${i}`}
              onClick={() => onSelect(i)}
              className={`rounded-xl border-2 p-3 text-left ${i === selected ? "border-teal bg-teal-50" : "border-navy/15 bg-white hover:border-navy/30"}`}
            >
              <span className="flex items-center gap-2 text-[15px] font-bold">
                <span aria-hidden="true" className={o.kind === "best_match" ? "h-1.5 w-6 rounded bg-teal" : "w-6 border-t-[4px] border-dashed border-navy"} />
                {L(o.label, o.labelTa)}
              </span>
              <span className="mt-1 block text-2xl font-bold">{o.distanceM} m</span>
              <span className="text-sm text-mute">{o.barriers.length} {L("reported barriers", "பதிவான தடைகள்")}</span>
            </button>
          ))}
        </div>
      )}

      {opt && (
        <div id={`route-panel-${selected}`} role={result.options.length > 1 ? "tabpanel" : undefined} aria-labelledby={result.options.length > 1 ? `route-tab-${selected}` : undefined} className="card grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-bold text-mute">{L(opt.label, opt.labelTa)}</p>
              <p className="text-3xl font-bold">
                {opt.distanceM} m
                <span className="ml-2 text-base font-normal text-mute">
                  {L("walking distance (time depends on your pace)", "நடை தூரம் (நேரம் உங்கள் வேகத்தைப் பொறுத்தது)")}
                </span>
              </p>
            </div>
            <ClaimBadge o={opt} />
          </div>
          <p className="text-[15px]">{opt.claimText}</p>
          <ConfidenceMeter value={opt.dataConfidence} />

          {opt.violations.length > 0 && (
            <div className="rounded-xl bg-danger-100/60 p-3 text-[15px]">
              <p className="font-bold text-danger">{L("Conflicts with your profile", "உங்கள் தேவையுடன் முரண்படுகிறது")}</p>
              <ul className="mt-1 list-disc pl-5">{opt.violations.map((v) => <li key={v}>{v}</li>)}</ul>
            </div>
          )}

          {opt.reasons.length > 0 && (
            <div>
              <h3 className="font-bold">{t("whyRoute")}</h3>
              <ul className="mt-1 grid gap-1 text-[15px]">
                {opt.reasons.map((r) => (
                  <li key={r} className="flex gap-2"><span aria-hidden="true" className="text-teal-700">→</span>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-bold">{t("barriersOnRoute")}</h3>
            {opt.barriers.length === 0 ? (
              <p className="text-[15px] text-mute">{L("No open reports on this route.", "இந்த வழியில் திறந்த பதிவுகள் இல்லை.")}</p>
            ) : (
              <ul className="mt-1 grid gap-1.5">
                {opt.barriers.map((b) => (
                  <li key={b.reportId}>
                    <button type="button" onClick={() => onOpenReport(b.reportId)} className="flex w-full min-h-[44px] items-start gap-2 rounded-xl border border-navy/10 px-3 py-2 text-left text-[15px] hover:border-teal">
                      <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${b.effect === "certain" ? "text-danger" : "text-amber"}`} aria-hidden="true" />
                      <span>
                        <strong>{L(CATEGORIES[b.category].en, CATEGORIES[b.category].ta)}</strong> — {L(SEVERITY_LABELS[b.severity].en, SEVERITY_LABELS[b.severity].ta)},{" "}
                        {b.stale ? L("may be outdated", "பழையதாக இருக்கலாம்") : L(STATUS_LABELS[b.status].en, STATUS_LABELS[b.status].ta).toLowerCase()}
                        <span className="block text-sm text-mute">{b.segmentName}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {opt.uncertainties.length > 0 && (
            <details className="rounded-xl bg-amber-100/60 p-3 text-[15px]" open={opt.claim === "uncertain"}>
              <summary className="cursor-pointer font-bold">
                {t("uncertainty")} ({opt.uncertainties.length})
              </summary>
              <ul className="mt-2 list-disc pl-5">{opt.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>
            </details>
          )}

          <details className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between font-bold">
              {t("directions")}
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={speak} className="btn-secondary px-3 text-[15px]" aria-pressed={speaking}>
                {speaking ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
                {speaking ? t("stopReading") : t("readAloud")}
              </button>
            </div>
            {ttsMsg && <p className="mt-2 text-sm text-mute" role="status">{ttsMsg}</p>}
            <ol className={`mt-3 grid gap-2 ${result.profile === "low_vision" ? "text-xl leading-relaxed" : "text-[15px]"}`}>
              {opt.instructions.map((i, n) => (
                <li key={n} className="flex gap-3 rounded-xl bg-mute-100 p-3">
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">{n + 1}</span>
                  <span>
                    {lang === "ta" ? i.textTa : i.text}
                    {i.warnings.length > 0 && <span className="mt-1 block font-bold text-danger">⚠ {i.warnings.join(" · ")}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </details>

          {opt.missions.length > 0 && (
            <div className="rounded-xl border-2 border-dashed border-[#C9A23A] bg-[#FFF8E1] p-3">
              <h3 className="font-bold">{t("missionsTitle")}</h3>
              <p className="text-[15px]">{t("missionsBody")}</p>
              <ul className="mt-2 grid gap-1.5 text-[15px]">
                {opt.missions.map((m) => (
                  <li key={m.segmentId} className="flex gap-2">
                    <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-navy bg-[#F4C55A] text-xs font-bold">?</span>
                    <a className="underline underline-offset-4" href={`/report?lat=${m.lat.toFixed(6)}&lng=${m.lng.toFixed(6)}`}>
                      {lang === "ta" ? m.questionTa : m.question}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-navy/10 pt-3">
            <button type="button" className="btn-secondary px-3 text-[15px]" onClick={copyLink}>
              <Copy className="h-5 w-5" aria-hidden="true" /> {copied ? t("copied") : t("shareRoute")}
            </button>
            <span role="status" className="sr-only">{copied ? t("copied") : ""}</span>
          </div>
          <p className="text-sm text-mute">{L(result.limitations, PROFILES[result.profile].limitationsTa)} {t("notGuarantee")}</p>
        </div>
      )}
    </section>
  );
}
