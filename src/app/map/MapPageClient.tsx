"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, LocateFixed, Loader2, Route as RouteIcon, X } from "lucide-react";
import { api, ApiError, getSavedProfile, saveProfile } from "@/lib/client";
import { CATEGORIES, STATUS_LABELS } from "@/lib/categories";
import { haversineM } from "@/lib/geo";
import type { RouteResult } from "@/lib/routing";
import { PROFILE_IDS, type Graph, type ProfileId } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import { useApp } from "@/components/Providers";
import { ProfilePicker } from "@/components/ProfilePicker";
import { RouteResults } from "@/components/RouteResults";
import { ReportDetail } from "@/components/ReportDetail";
import { MapLegend } from "@/components/Legend";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center rounded-2xl bg-mute-100 text-mute">Loading map…</div>,
});

type LoadState = "loading" | "ready" | "error";

export default function MapPageClient() {
  const { t, L, lang } = useApp();
  const params = useSearchParams();
  const router = useRouter();

  const [graph, setGraph] = useState<Graph | null>(null);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [load, setLoad] = useState<LoadState>("loading");
  const [loadErr, setLoadErr] = useState("");

  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [profile, setProfile] = useState<ProfileId>("wheelchair");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [routing, setRouting] = useState(false);
  const [routeErr, setRouteErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [geoMsg, setGeoMsg] = useState("");
  const [openReport, setOpenReport] = useState<string | null>(null);

  useEffect(() => {
    const p = params.get("profile");
    if (p && (PROFILE_IDS as readonly string[]).includes(p)) setProfile(p as ProfileId);
    else setProfile(getSavedProfile() ?? "wheelchair");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    setLoad("loading");
    try {
      const [g, r] = await Promise.all([
        api<{ graph: Graph }>("/api/graph"),
        api<{ reports: PublicReport[] }>("/api/barriers"),
      ]);
      setGraph(g.graph);
      setReports(r.reports);
      setLoad("ready");
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Could not load map data.");
      setLoad("error");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const places = useMemo(() => (graph?.nodes ?? []).filter((n) => n.selectable).sort((a, b) => a.name.localeCompare(b.name)), [graph]);
  const nodeById = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);

  const runRoute = useCallback(
    async (f: string, d: string, p: ProfileId) => {
      setFormErr("");
      if (!f || !d) { setFormErr(L("Please choose both a start and a destination.", "தொடக்கம் மற்றும் சேருமிடம் இரண்டையும் தேர்வுசெய்யவும்.")); return; }
      if (f === d) { setFormErr(L("Start and destination must be different.", "தொடக்கமும் சேருமிடமும் வேறுபட வேண்டும்.")); return; }
      setRouting(true);
      setRouteErr("");
      try {
        const res = await api<RouteResult>("/api/route", { method: "POST", json: { from: f, to: d, profile: p } });
        setResult(res);
        setSelected(0);
        router.replace(`/map?from=${f}&to=${d}&profile=${p}`, { scroll: false });
      } catch (e) {
        setRouteErr(e instanceof ApiError ? e.message : "Routing failed.");
      } finally {
        setRouting(false);
      }
    },
    [L, router],
  );

  // auto-run when opened from a shared link
  useEffect(() => {
    if (load === "ready" && params.get("from") && params.get("to") && !result) runRoute(params.get("from")!, params.get("to")!, (params.get("profile") as ProfileId) || profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function useMyLocation() {
    setGeoMsg("");
    if (!("geolocation" in navigator)) { setGeoMsg(t("locDenied")); return; }
    setGeoMsg(t("locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        let best: { id: string; d: number } | null = null;
        for (const n of places) {
          const d = haversineM(here, [n.lat, n.lng]);
          if (!best || d < best.d) best = { id: n.id, d };
        }
        if (best && best.d < 500) { setFrom(best.id); setGeoMsg(L(`Start set to the nearest place: ${nodeById.get(best.id)!.name}`, `அருகிலுள்ள இடம் தொடக்கமாக: ${nodeById.get(best.id)!.nameTa}`)); }
        else setGeoMsg(t("locOutside"));
      },
      () => setGeoMsg(t("locDenied")),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function changeProfile(p: ProfileId) {
    setProfile(p);
    saveProfile(p);
    if (result) runRoute(from, to, p);
  }

  const opt = result?.options[selected];
  const routeReportIds = new Set(result?.options.flatMap((o) => o.barriers.map((b) => b.reportId)) ?? []);
  const visibleReports = reports.filter((r) => r.status !== "resolved" || routeReportIds.has(r.id));
  const detail = openReport ? reports.find((r) => r.id === openReport) ?? null : null;
  const shareUrl = typeof window !== "undefined" && result ? `${window.location.origin}/map?from=${from}&to=${to}&profile=${profile}` : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">{graph ? L(graph.areaName, graph.areaNameTa) : " "}</p>
          <h1 className="text-3xl font-bold">{L("Accessible route finder", "அணுகக்கூடிய வழி கண்டறிதல்")}</h1>
        </div>
      </div>

      {load === "error" && (
        <div role="alert" className="card mb-4 border-danger/40 bg-danger-100/50">
          <p className="font-bold text-danger">{loadErr}</p>
          <p className="text-[15px]">{L("The map data service is unavailable. You can still read the profile rules on “My mobility needs”.", "வரைபடச் சேவை கிடைக்கவில்லை.")}</p>
          <button type="button" className="btn-secondary mt-3" onClick={loadData}>{t("retry")}</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(340px,420px)_1fr] lg:grid-rows-[auto_1fr]">
        <div className="order-1 grid content-start gap-5 lg:col-start-1 lg:row-start-1">
          <form
            className="card grid gap-4"
            aria-labelledby="plan-h"
            onSubmit={(e) => { e.preventDefault(); runRoute(from, to, profile); }}
            noValidate
          >
            <h2 id="plan-h" className="sr-only">{L("Plan a route", "வழியைத் திட்டமிடு")}</h2>
            <div className="grid gap-3">
              <div>
                <label htmlFor="from" className="label">{t("from")}</label>
                <select id="from" className="input" value={from} onChange={(e) => setFrom(e.target.value)} disabled={load !== "ready"} aria-describedby={formErr ? "form-err" : undefined} aria-invalid={!!formErr && !from}>
                  <option value="">{t("choose")}</option>
                  {places.map((n) => <option key={n.id} value={n.id}>{L(n.name, n.nameTa)}</option>)}
                </select>
                <button type="button" onClick={useMyLocation} className="btn-ghost mt-1 px-2 text-[15px] text-teal-700">
                  <LocateFixed className="h-5 w-5" aria-hidden="true" /> {t("useLocation")}
                </button>
                <p role="status" aria-live="polite" className="text-sm text-mute">{geoMsg}</p>
              </div>
              <div className="flex justify-center">
                <button type="button" className="btn-ghost min-h-[40px] py-1 text-[15px]" onClick={() => { setFrom(to); setTo(from); }}>
                  <ArrowUpDown className="h-5 w-5" aria-hidden="true" /> {t("swap")}
                </button>
              </div>
              <div>
                <label htmlFor="to" className="label">{t("to")}</label>
                <select id="to" className="input" value={to} onChange={(e) => setTo(e.target.value)} disabled={load !== "ready"} aria-describedby={formErr ? "form-err" : undefined} aria-invalid={!!formErr && !to}>
                  <option value="">{t("choose")}</option>
                  {places.map((n) => <option key={n.id} value={n.id}>{L(n.name, n.nameTa)}</option>)}
                </select>
              </div>
            </div>
            <ProfilePicker value={profile} onChange={changeProfile} />
            {formErr && <p id="form-err" role="alert" className="text-[15px] font-bold text-danger">{formErr}</p>}
            <button type="submit" className="btn-primary" disabled={routing || load !== "ready"}>
              {routing ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <RouteIcon className="h-5 w-5" aria-hidden="true" />}
              {t("findRoute")}
            </button>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-mute">{L("Try:", "முயற்சி:")}</span>
              <button type="button" className="underline underline-offset-4" onClick={() => { setFrom("bus_north"); setTo("health_centre"); runRoute("bus_north", "health_centre", profile); }}>
                {L("Bus Stop → Health Centre", "பேருந்து நிறுத்தம் → சுகாதார நிலையம்")}
              </button>
              <button type="button" className="underline underline-offset-4" onClick={() => { setFrom("bus_north"); setTo("market_upper"); runRoute("bus_north", "market_upper", profile); }}>
                {L("Bus Stop → Market Upper Level", "பேருந்து நிறுத்தம் → சந்தை மேல்தளம்")}
              </button>
              <button type="button" className="underline underline-offset-4" onClick={() => { setFrom("school"); setTo("park"); runRoute("school", "park", profile); }}>
                {L("School → Park", "பள்ளி → பூங்கா")}
              </button>
            </div>
          </form>
        </div>

        <div className="order-3 grid content-start gap-5 lg:col-start-1 lg:row-start-2">
          <div aria-live="polite" aria-busy={routing}>
            {routeErr && (
              <div role="alert" className="card border-danger/40 bg-danger-100/50">
                <p className="font-bold text-danger">{routeErr}</p>
                <button type="button" className="btn-secondary mt-3" onClick={() => runRoute(from, to, profile)}>{t("retry")}</button>
              </div>
            )}
            {!result && !routeErr && <p className="card text-[15px] text-mute">{t("emptyRoutes")}</p>}
          </div>
          {result && (
            <RouteResults result={result} selected={selected} onSelect={setSelected} onOpenReport={setOpenReport} shareUrl={shareUrl} />
          )}
        </div>

        <div className="order-2 grid content-start gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="relative h-[58vh] min-h-[360px] lg:h-[calc(100vh-200px)]">
            {graph && (
              <MapView
                center={graph.center}
                nodes={graph.nodes}
                segments={graph.segments}
                reports={visibleReports}
                routes={(result?.options ?? []).map((o, i) => ({ id: o.kind, kind: o.kind, path: o.path, selected: i === selected, label: L(o.label, o.labelTa) }))}
                start={nodeById.get(from) ?? null}
                end={nodeById.get(to) ?? null}
                missions={opt?.missions ?? []}
                onSelectReport={setOpenReport}
                ariaLabel={L("Map of the pilot area with footpaths, routes and reported barriers. Barrier markers can be reached with the Tab key.", "நடைபாதைகள், வழிகள், பதிவான தடைகள் கொண்ட வரைபடம்.")}
                className="h-full"
                statusLabel={(s) => L(STATUS_LABELS[s].en, STATUS_LABELS[s].ta)}
                categoryLabel={(c) => L(CATEGORIES[c].en, CATEGORIES[c].ta)}
              />
            )}
            {load === "loading" && <div className="grid h-full place-items-center rounded-2xl bg-mute-100 text-mute">{t("loading")}</div>}
            {detail && (
              <div role="dialog" aria-modal="false" aria-label={L("Barrier details", "தடை விவரங்கள்")} className="absolute inset-x-3 bottom-3 z-[1000] max-h-[75%] overflow-y-auto rounded-2xl border border-navy/15 bg-white p-4 shadow-xl sm:left-auto sm:w-[380px]">
                <button type="button" onClick={() => setOpenReport(null)} className="btn-ghost absolute right-2 top-2 min-h-[40px] px-2" aria-label={t("close")}>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                <ReportDetail report={detail} onUpdated={(r) => { setReports((rs) => rs.map((x) => (x.id === r.id ? r : x))); if (result) runRoute(from, to, profile); }} />
              </div>
            )}
          </div>
          <MapLegend />
          <p className="text-sm text-mute">{L(`Showing ${visibleReports.length} open reports. Resolved reports are hidden unless on your route.`, `${visibleReports.length} திறந்த பதிவுகள் காட்டப்படுகின்றன.`)} {lang === "ta" ? "" : ""}</p>
        </div>
      </div>
    </div>
  );
}
