"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { CATEGORIES, STATUS_LABELS } from "@/lib/categories";
import type { GraphNode, Segment } from "@/lib/types";
import type { PublicReport } from "@/app/api/barriers/public";
import type { VerificationMission } from "@/lib/routing";

export interface MapRoute {
  id: string;
  kind: "shortest" | "best_match";
  path: [number, number][];
  selected: boolean;
  label: string;
}

interface Props {
  center: [number, number];
  zoom?: number;
  nodes?: GraphNode[];
  segments?: Segment[];
  reports?: PublicReport[];
  routes?: MapRoute[];
  start?: GraphNode | null;
  end?: GraphNode | null;
  picked?: [number, number] | null;
  missions?: VerificationMission[];
  onPick?: (lat: number, lng: number) => void;
  onSelectReport?: (id: string) => void;
  onSelectNode?: (id: string) => void;
  ariaLabel: string;
  className?: string;
  statusLabel?: (s: PublicReport["status"]) => string;
  categoryLabel?: (c: PublicReport["category"]) => string;
}

const STATUS_MARKER: Record<PublicReport["status"], { bg: string; fg: string; border: string; dash?: boolean }> = {
  pending: { bg: "#FFFFFF", fg: "#7A3A06", border: "#B45309", dash: true },
  confirmed: { bg: "#B42318", fg: "#FFFFFF", border: "#7A1A12" },
  disputed: { bg: "#EEE8FA", fg: "#5B3A9E", border: "#5B3A9E", dash: true },
  resolved: { bg: "#DCFAE6", fg: "#067647", border: "#067647" },
};

function reportIcon(r: PublicReport) {
  const s = STATUS_MARKER[r.status];
  const glyph = STATUS_LABELS[r.status].glyph;
  const cat = CATEGORIES[r.category].glyph;
  const stale = r.freshness.stale && r.status !== "resolved";
  return L.divIcon({
    className: "np-marker",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="position:relative;width:38px;height:38px;border-radius:11px;background:${s.bg};border:3px ${s.dash ? "dashed" : "solid"} ${s.border};display:grid;place-items:center;box-shadow:0 2px 6px rgba(19,38,61,.25);font:700 17px/1 'Atkinson Hyperlegible',system-ui;color:${s.fg};${stale ? "opacity:.75;" : ""}">
      <span>${cat}</span>
      <span style="position:absolute;right:-8px;top:-8px;min-width:20px;height:20px;border-radius:10px;background:#13263D;color:#fff;font-size:13px;display:grid;place-items:center;border:2px solid #fff">${glyph}</span>
      ${stale ? `<span style="position:absolute;left:-8px;bottom:-8px;width:20px;height:20px;border-radius:10px;background:#fff;border:2px solid #13263D;font-size:11px;display:grid;place-items:center">⌛</span>` : ""}
    </div>`,
  });
}

function endpointIcon(letter: string, color: string) {
  return L.divIcon({
    className: "np-marker",
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    html: `<svg width="34" height="42" viewBox="0 0 34 42" aria-hidden="true"><path d="M17 41 C17 41 3 25 3 15 a14 14 0 1 1 28 0 C31 25 17 41 17 41z" fill="${color}" stroke="#fff" stroke-width="2.5"/><text x="17" y="20" text-anchor="middle" font-family="Atkinson Hyperlegible,system-ui" font-size="15" font-weight="700" fill="#fff">${letter}</text></svg>`,
  });
}

const pickIcon = L.divIcon({
  className: "np-marker",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<div style="width:36px;height:36px;border-radius:18px;border:4px solid #0B7A75;background:rgba(11,122,117,.15);display:grid;place-items:center"><div style="width:10px;height:10px;border-radius:5px;background:#0B7A75"></div></div>`,
});

function missionIcon() {
  return L.divIcon({
    className: "np-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:14px;background:#F4C55A;border:2px solid #13263D;display:grid;place-items:center;font:700 15px/1 system-ui;color:#13263D">?</div>`,
  });
}

function FitTo({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

function ClickPicker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapView(props: Props) {
  const {
    center, zoom = 16, nodes = [], segments = [], reports = [], routes = [], start, end, picked, missions = [],
    onPick, onSelectReport, onSelectNode, ariaLabel, className = "", statusLabel, categoryLabel,
  } = props;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const fitPoints = useMemo(() => {
    const sel = routes.find((r) => r.selected) ?? routes[0];
    return sel?.path ?? [];
  }, [routes]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-navy/10 ${className}`} role="region" aria-label={ariaLabel}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full" style={{ minHeight: 320 }} attributionControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {/* the modelled footpath network */}
        {segments.map((s) => {
          const a = nodeById.get(s.from);
          const b = nodeById.get(s.to);
          if (!a || !b) return null;
          const pts: [number, number][] = [[a.lat, a.lng], ...(s.via ?? []), [b.lat, b.lng]];
          return (
            <Polyline
              key={s.id}
              positions={pts}
              pathOptions={{ color: s.steps === "stairs_only" ? "#B42318" : "#40566F", weight: 3, opacity: 0.35, dashArray: s.verification === "unverified" ? "2 8" : undefined }}
            >
              <Tooltip className="np-tip" sticky>
                {s.name}
                {s.steps === "stairs_only" ? " — stairs only" : ""}
                {s.verification === "unverified" ? " — unverified" : ""}
              </Tooltip>
            </Polyline>
          );
        })}
        {/* routes: unselected first so the selected one draws on top */}
        {[...routes].sort((a, b) => Number(a.selected) - Number(b.selected)).map((r) => (
          <Polyline key={r.id + "-casing"} positions={r.path} pathOptions={{ color: "#FFFFFF", weight: r.selected ? 11 : 8, opacity: 0.95 }} />
        ))}
        {[...routes].sort((a, b) => Number(a.selected) - Number(b.selected)).map((r) => (
          <Polyline
            key={r.id}
            positions={r.path}
            pathOptions={{
              color: r.kind === "best_match" ? "#0B7A75" : "#13263D",
              weight: r.selected ? 7 : 5,
              opacity: r.selected ? 1 : 0.55,
              dashArray: r.kind === "shortest" ? "10 9" : undefined,
            }}
          >
            <Tooltip className="np-tip" sticky>{r.label}</Tooltip>
          </Polyline>
        ))}
        {/* selectable places */}
        {nodes.filter((n) => n.selectable).map((n) => (
          <CircleMarker
            key={n.id}
            center={[n.lat, n.lng]}
            radius={7}
            pathOptions={{ color: "#13263D", weight: 2, fillColor: "#FFFFFF", fillOpacity: 1 }}
            eventHandlers={onSelectNode ? { click: () => onSelectNode(n.id) } : undefined}
          >
            <Tooltip className="np-tip" direction="top" offset={[0, -6]}>{n.name}</Tooltip>
          </CircleMarker>
        ))}
        {missions.map((m) => (
          <Marker key={"m-" + m.segmentId} position={[m.lat, m.lng]} icon={missionIcon()} title={`Data check needed: ${m.question}`} keyboard>
            <Tooltip className="np-tip">{m.question}</Tooltip>
          </Marker>
        ))}
        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={reportIcon(r)}
            keyboard
            title={`${statusLabel ? statusLabel(r.status) : r.status}: ${categoryLabel ? categoryLabel(r.category) : r.category}${r.freshness.stale && r.status !== "resolved" ? " (may be outdated)" : ""}`}
            eventHandlers={{ click: () => onSelectReport?.(r.id), keypress: (e) => { if ((e.originalEvent as KeyboardEvent).key === "Enter") onSelectReport?.(r.id); } }}
          />
        ))}
        {start && <Marker position={[start.lat, start.lng]} icon={endpointIcon("A", "#13263D")} title={`Start: ${start.name}`} keyboard={false} />}
        {end && <Marker position={[end.lat, end.lng]} icon={endpointIcon("B", "#0B7A75")} title={`Destination: ${end.name}`} keyboard={false} />}
        {picked && <Marker position={picked} icon={pickIcon} title="Selected barrier location" keyboard={false} />}
        <ClickPicker onPick={onPick} />
        <FitTo points={fitPoints} />
      </MapContainer>
    </div>
  );
}
