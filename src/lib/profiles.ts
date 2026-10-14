import type { ProfileId } from "./types";

export interface ProfileInfo {
  id: ProfileId;
  en: string;
  ta: string;
  summary: string;
  summaryTa: string;
  /** What this profile actually changes in routing / guidance — shown verbatim in the UI. */
  rules: string[];
  rulesTa: string[];
  limitations: string;
  limitationsTa: string;
}

export const PROFILES: Record<ProfileId, ProfileInfo> = {
  wheelchair: {
    id: "wheelchair",
    en: "Wheelchair / step-free",
    ta: "சக்கர நாற்காலி / படியில்லா வழி",
    summary: "Avoids stairs and steps. Prefers verified, wide, gently sloped footpaths with ramps.",
    summaryTa: "படிகளைத் தவிர்க்கும். சரிபார்க்கப்பட்ட, அகலமான, சாய்வுதளம் உள்ள பாதைகளை முன்னுரிமை தரும்.",
    rules: [
      "Never uses segments with known stairs or steps.",
      "Never uses segments with a confirmed impassable barrier, a missing ramp where one is needed, a slope above 8% or a width under 0.9 m.",
      "Unknown steps, ramps or surface are allowed only as a last resort and are flagged — the route is then NOT called step-free.",
      "Pending, disputed or stale reports add a penalty and are listed as uncertainty.",
    ],
    rulesTa: [
      "படிகள் உள்ள பகுதிகளை ஒருபோதும் பயன்படுத்தாது.",
      "உறுதிசெய்யப்பட்ட கடக்க முடியாத தடை, தேவையான சாய்வுதளம் இல்லாமை, 8%க்கு மேல் சாய்வு அல்லது 0.9 மீக்குக் குறைவான அகலம் உள்ள பகுதிகளைத் தவிர்க்கும்.",
      "தெரியாத தகவல் உள்ள பகுதிகள் கடைசி வழியாக மட்டுமே; அப்போது வழி 'படியில்லா' எனக் கூறப்படாது.",
      "சரிபார்ப்பில் / சர்ச்சையில் / பழைய பதிவுகள் அபராதம் சேர்க்கும்.",
    ],
    limitations: "Kerb heights, lift status and temporary parking are often not in the data. Always check the listed uncertainties.",
    limitationsTa: "நடைபாதை விளிம்பு உயரம், லிஃப்ட் நிலை போன்றவை தரவில் இல்லாமல் இருக்கலாம்.",
  },
  walking_aid: {
    id: "walking_aid",
    en: "Walking aid / limited stamina",
    ta: "நடை உதவி / குறைந்த சகிப்புத்தன்மை",
    summary: "Accepts a few steps with a handrail, but strongly avoids poor surfaces, obstructions and long detours.",
    summaryTa: "கைப்பிடியுடன் சில படிகளை ஏற்கும்; மோசமான மேற்பரப்பு மற்றும் நீண்ட சுற்றுவழிகளைத் தவிர்க்கும்.",
    rules: [
      "Steps are allowed but penalised; steps without a handrail are penalised much more.",
      "Poor or unknown surfaces and debris are strongly penalised.",
      "Distance matters more than for the wheelchair profile, so very long detours are avoided.",
      "Confirmed impassable barriers are never used.",
    ],
    rulesTa: [
      "படிகள் அனுமதிக்கப்படும், ஆனால் அபராதம் உண்டு; கைப்பிடி இல்லையெனில் அதிக அபராதம்.",
      "மோசமான அல்லது தெரியாத மேற்பரப்பு, குப்பைகளுக்கு அதிக அபராதம்.",
      "தூரம் முக்கியம் — மிக நீண்ட சுற்றுவழிகள் தவிர்க்கப்படும்.",
      "உறுதிசெய்யப்பட்ட கடக்க முடியாத தடைகள் பயன்படுத்தப்படாது.",
    ],
    limitations: "Rest points and seating are not yet mapped.",
    limitationsTa: "ஓய்வு இடங்கள் இன்னும் வரைபடத்தில் இல்லை.",
  },
  general: {
    id: "general",
    en: "General pedestrian",
    ta: "பொது பாதசாரி",
    summary: "Shortest walk that avoids confirmed impassable barriers.",
    summaryTa: "உறுதிசெய்யப்பட்ட கடக்க முடியாத தடைகளைத் தவிர்க்கும் குறுகிய நடை.",
    rules: [
      "Mostly distance-based.",
      "Confirmed impassable barriers (e.g. deep flooding) are avoided.",
      "Other reports add a small penalty and are listed on the route.",
    ],
    rulesTa: [
      "பெரும்பாலும் தூர அடிப்படையில்.",
      "உறுதிசெய்யப்பட்ட கடக்க முடியாத தடைகள் தவிர்க்கப்படும்.",
      "பிற பதிவுகள் சிறிய அபராதம் சேர்க்கும்.",
    ],
    limitations: "Not tuned for any specific mobility need.",
    limitationsTa: "குறிப்பிட்ட இயக்கத் தேவைக்கு வடிவமைக்கப்படவில்லை.",
  },
  low_vision: {
    id: "low_vision",
    en: "Low-vision-friendly guidance",
    ta: "குறைந்த பார்வைக்கு ஏற்ற வழிகாட்டல்",
    summary: "Prefers signalised crossings, tactile paving and obstruction-free footpaths, with large-text and spoken directions.",
    summaryTa: "சிக்னல் கடவை, தொடு உணர் நடைபாதை, தடையற்ற பாதைகளை முன்னுரிமை தரும்; பெரிய எழுத்து மற்றும் குரல் வழிகாட்டல்.",
    rules: [
      "Road crossings without a known safe/signalised crossing are heavily penalised.",
      "Segments with tactile paving are preferred; unknown tactile data is listed as uncertainty.",
      "Debris, broken footpaths and flooding are strongly penalised (trip hazards).",
      "Directions can be read aloud (Tamil or English, where your device supports it).",
    ],
    rulesTa: [
      "பாதுகாப்பான சிக்னல் கடவை இல்லாத சாலைக் கடப்புகளுக்கு அதிக அபராதம்.",
      "தொடு உணர் நடைபாதை உள்ள பகுதிகள் முன்னுரிமை பெறும்.",
      "குப்பைகள், உடைந்த நடைபாதை, வெள்ளம் — அதிக அபராதம்.",
      "வழிகாட்டல்களைக் குரலில் கேட்கலாம் (சாதனம் ஆதரித்தால்).",
    ],
    limitations:
      "This is NOT a certified safe route for blind or visually impaired travellers. Crossing signals, tactile paving and moving obstacles are only partly mapped in this pilot. Use your usual mobility aids and judgement.",
    limitationsTa:
      "இது பார்வையற்றோருக்கான சான்றளிக்கப்பட்ட பாதுகாப்பான வழி அல்ல. சிக்னல், தொடு உணர் நடைபாதை தகவல்கள் இந்த முன்னோட்டத்தில் பகுதியளவே உள்ளன.",
  },
};
