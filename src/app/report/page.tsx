import type { Metadata } from "next";
import { Suspense } from "react";
import ReportPageClient from "./ReportPageClient";

export const metadata: Metadata = { title: "Report a barrier" };

export default function ReportPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <ReportPageClient />
    </Suspense>
  );
}
