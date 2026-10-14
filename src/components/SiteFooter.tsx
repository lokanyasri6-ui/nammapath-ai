"use client";

import Link from "next/link";
import { useApp } from "./Providers";

export function SiteFooter() {
  const { t, L } = useApp();
  return (
    <footer className="mt-16 border-t border-navy/10 bg-[#F7FAFB]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-[15px] sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-bold">NammaPath AI</p>
          <p className="mt-1 text-mute">
            {L(
              "Hackathon MVP for “AI for Better Living & Smarter Communities”. Route suggestions are based on available data and are never a safety guarantee.",
              "“சிறந்த வாழ்வு மற்றும் சமூகத்திற்கான AI” ஹேக்கத்தான் முன்மாதிரி. வழி பரிந்துரைகள் பாதுகாப்பு உத்தரவாதம் அல்ல.",
            )}
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid gap-1.5">
            <li><Link className="underline-offset-4 hover:underline" href="/map">{t("navMap")}</Link></li>
            <li><Link className="underline-offset-4 hover:underline" href="/report">{t("navReport")}</Link></li>
            <li><Link className="underline-offset-4 hover:underline" href="/reports">{t("navReports")}</Link></li>
            <li><Link className="underline-offset-4 hover:underline" href="/moderate">{t("navModerate")}</Link></li>
          </ul>
        </nav>
        <p className="text-mute">
          {L("Map tiles © OpenStreetMap contributors. Pilot data is synthetic until independently verified.", "வரைபட ஓடுகள் © OpenStreetMap பங்களிப்பாளர்கள். முன்னோட்டத் தரவு சரிபார்க்கப்படும் வரை செயற்கையானது.")}
        </p>
      </div>
    </footer>
  );
}
