"use client";

import { Info } from "lucide-react";
import { useApp } from "./Providers";

/** Persistent, honest notice that seeded data is synthetic. */
export function DemoBanner() {
  const { t, status } = useApp();
  return (
    <div role="note" aria-label="Data notice" className="border-b border-amber/30 bg-amber-100/70">
      <div className="mx-auto flex max-w-7xl items-start gap-2.5 px-4 py-2 text-[15px] leading-snug text-[#7A3A06] sm:px-6">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <strong>{t("demoBanner")}</strong>{" "}
          {status && (
            <span>
              ({status.ai.mode === "live" ? t("aiLive") : t("aiDemo")} · {status.database.mode === "supabase" ? t("dbLive") : t("dbMemory")})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
