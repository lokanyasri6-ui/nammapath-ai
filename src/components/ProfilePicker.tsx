"use client";

import { Accessibility, Eye, Footprints, PersonStanding } from "lucide-react";
import { PROFILES } from "@/lib/profiles";
import { PROFILE_IDS, type ProfileId } from "@/lib/types";
import { useApp } from "./Providers";

export const PROFILE_ICON: Record<ProfileId, typeof Accessibility> = {
  wheelchair: Accessibility,
  walking_aid: PersonStanding,
  general: Footprints,
  low_vision: Eye,
};

export function ProfilePicker({ value, onChange, name = "profile" }: { value: ProfileId; onChange: (p: ProfileId) => void; name?: string }) {
  const { t, L } = useApp();
  return (
    <fieldset>
      <legend className="label">{t("profile")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {PROFILE_IDS.map((id) => {
          const Icon = PROFILE_ICON[id];
          const checked = value === id;
          return (
            <label
              key={id}
              className={`flex min-h-[56px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-[15px] font-bold leading-tight has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal ${checked ? "border-teal bg-teal-50 text-teal-700" : "border-navy/15 hover:border-navy/30"}`}
            >
              <input type="radio" name={name} value={id} checked={checked} onChange={() => onChange(id)} className="sr-only" />
              <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {L(PROFILES[id].en, PROFILES[id].ta)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
