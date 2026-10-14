"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { getSavedProfile, saveProfile } from "@/lib/client";
import { PROFILES } from "@/lib/profiles";
import { PROFILE_IDS, type ProfileId } from "@/lib/types";
import { useApp } from "@/components/Providers";
import { PROFILE_ICON } from "@/components/ProfilePicker";

export default function PreferencesClient() {
  const { L, lang } = useApp();
  const [profile, setProfile] = useState<ProfileId>("wheelchair");
  const [saved, setSaved] = useState(false);
  useEffect(() => setProfile(getSavedProfile() ?? "wheelchair"), []);

  function choose(p: ProfileId) {
    setProfile(p);
    saveProfile(p);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <p className="eyebrow">{L("Your preferences, your choice", "உங்கள் விருப்பம்")}</p>
      <h1 className="text-3xl font-bold">{L("My mobility needs", "என் இயக்கத் தேவைகள்")}</h1>
      <p className="mt-2 max-w-3xl text-navy-700">
        {L(
          "Choose the profile that best matches how you travel today. We never ask for a diagnosis or any medical information, and your choice is stored only on this device. You can switch at any time — for example when travelling with a pram, a suitcase or a friend.",
          "இன்று நீங்கள் பயணிக்கும் விதத்துக்கு ஏற்ற தேவையைத் தேர்வுசெய்யுங்கள். நோய் விவரம் அல்லது மருத்துவத் தகவல் கேட்கப்படாது; உங்கள் தேர்வு இந்தச் சாதனத்தில் மட்டுமே சேமிக்கப்படும்.",
        )}
      </p>

      <fieldset className="mt-6">
        <legend className="sr-only">{L("Mobility profile", "இயக்கத் தேவை")}</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {PROFILE_IDS.map((id) => {
            const p = PROFILES[id];
            const Icon = PROFILE_ICON[id];
            const checked = profile === id;
            return (
              <label key={id} className={`card cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal ${checked ? "border-2 border-teal bg-teal-50" : "border-2"}`}>
                <div className="flex items-start gap-3">
                  <input type="radio" name="profile" value={id} checked={checked} onChange={() => choose(id)} className="mt-2 h-5 w-5 accent-teal" />
                  <div>
                    <p className="flex items-center gap-2 text-xl font-bold">
                      <Icon className="h-7 w-7 text-teal-700" aria-hidden="true" /> {L(p.en, p.ta)}
                      {checked && <CheckCircle2 className="h-5 w-5 text-teal-700" aria-label={L("selected", "தேர்ந்தெடுக்கப்பட்டது")} />}
                    </p>
                    <p className="mt-1 text-[15px] text-navy-700">{L(p.summary, p.summaryTa)}</p>
                    <p className="mt-3 text-sm font-bold uppercase tracking-wide text-mute">{L("What changes", "என்ன மாறும்")}</p>
                    <ul className="mt-1 grid gap-1 text-[15px]">
                      {(lang === "ta" ? p.rulesTa : p.rules).map((r) => <li key={r} className="flex gap-2"><span aria-hidden="true" className="text-teal-700">•</span>{r}</li>)}
                    </ul>
                    <p className="mt-3 flex gap-2 rounded-xl bg-amber-100/70 p-2.5 text-sm text-[#7A3A06]">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{L(p.limitations, p.limitationsTa)}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p role="status" aria-live="polite" className="mt-4 font-bold text-teal-700">{saved ? L("Saved on this device.", "இந்தச் சாதனத்தில் சேமிக்கப்பட்டது.") : ""}</p>
      <Link href={`/map?profile=${profile}`} className="btn-primary mt-2">{L("Find a route with this profile", "இந்தத் தேவையுடன் வழியைக் கண்டறி")}</Link>
    </div>
  );
}
