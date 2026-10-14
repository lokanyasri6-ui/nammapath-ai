import type { Metadata } from "next";
import { Suspense } from "react";
import MapPageClient from "./MapPageClient";

export const metadata: Metadata = { title: "Route map" };

export default function MapPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <MapPageClient />
    </Suspense>
  );
}
