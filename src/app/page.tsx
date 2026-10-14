"use client";

import Link from "next/link";
import { ArrowRight, Camera, ClipboardCheck, Hourglass, Languages, ListChecks, MapPinned, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import { useApp } from "@/components/Providers";

function HeroFigure() {
  const { L } = useApp();
  return (
    <figure className="relative">
      <div className="tactile absolute -inset-3 rounded-[28px] opacity-60" aria-hidden="true" />
      <div className="relative rounded-3xl border border-navy/10 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(19,38,61,0.25)]">
        <svg viewBox="0 0 420 300" className="h-auto w-full" role="img" aria-labelledby="hero-fig-t">
          <title id="hero-fig-t">
            {L(
              "Illustration: the shortest path crosses a footbridge with stairs; the suggested step-free path is longer and uses a signalised crossing with kerb ramps.",
              "விளக்கப்படம்: குறுகிய வழி படிகள் உள்ள நடைமேம்பாலத்தைக் கடக்கிறது; பரிந்துரைக்கப்பட்ட படியில்லா வழி நீளமானது.",
            )}
          </title>
          <rect x="0" y="0" width="420" height="300" rx="16" fill="#F4F8F8" />
          {/* main road */}
          <rect x="0" y="128" width="420" height="44" fill="#DCE3EA" />
          <line x1="0" y1="150" x2="420" y2="150" stroke="#fff" strokeWidth="3" strokeDasharray="14 12" />
          {/* blocks */}
          {[[20, 20], [150, 20], [290, 20], [20, 190], [150, 190], [290, 190]].map(([x, y]) => (
            <rect key={`${x}${y}`} x={x} y={y} width="110" height="90" rx="10" fill="#E9EEF2" />
          ))}
          {/* shortest: footbridge with stairs */}
          <path d="M 205 40 L 205 260" stroke="#13263D" strokeWidth="6" strokeDasharray="10 9" fill="none" strokeLinecap="round" />
          <g transform="translate(186 132)">
            <rect width="38" height="36" rx="8" fill="#B42318" />
            <path d="M8 28 h7 v-7 h7 v-7 h7 v-7" stroke="#fff" strokeWidth="3" fill="none" />
          </g>
          {/* accessible route */}
          <path d="M 205 40 L 205 105 L 340 105 L 340 195 L 205 195 L 205 260" stroke="#0B7A75" strokeWidth="7" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <g transform="translate(326 136)">
            <rect width="28" height="28" rx="14" fill="#fff" stroke="#0B7A75" strokeWidth="3" />
            <path d="M8 19 L20 9" stroke="#0B7A75" strokeWidth="3" />
          </g>
          {/* endpoints */}
          <circle cx="205" cy="40" r="13" fill="#13263D" />
          <text x="205" y="45" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">A</text>
          <circle cx="205" cy="260" r="13" fill="#0B7A75" />
          <text x="205" y="265" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">B</text>
          {/* pending report */}
          <g transform="translate(250 92)">
            <rect width="26" height="26" rx="7" fill="#fff" stroke="#B45309" strokeWidth="2.5" strokeDasharray="4 3" />
            <text x="13" y="18" textAnchor="middle" fontSize="15" fontWeight="700" fill="#7A3A06">?</text>
          </g>
        </svg>
        <figcaption className="mt-3 grid gap-1.5 text-[15px]">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="w-7 border-t-[4px] border-dashed border-navy" />{L("Shortest: 734 m, but a stairs-only footbridge", "குறுகியது: 734 மீ, ஆனால் படிகள் மட்டும்")}</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-7 rounded bg-teal" />{L("Step-free match: 1,536 m via a signalised crossing", "படியில்லா வழி: 1,536 மீ, சிக்னல் கடவை வழியாக")}</span>
          <span className="text-sm text-mute">{L("From the synthetic demo pilot.", "மாதிரி முன்னோட்டத் தரவிலிருந்து.")}</span>
        </figcaption>
      </div>
    </figure>
  );
}

export default function Home() {
  const { t, L } = useApp();

  const features = [
    {
      icon: Camera,
      title: L("AI-assisted photo reports", "AI உதவியுடன் புகைப்படப் பதிவு"),
      body: L(
        "Snap a barrier; a vision model suggests category, severity and confidence with its evidence. You confirm or correct it — low-confidence results always go to human review.",
        "தடையைப் படம் எடுங்கள்; AI வகை, தீவிரம், நம்பகத்தன்மையைப் பரிந்துரைக்கும். நீங்கள் உறுதிசெய்யுங்கள் அல்லது திருத்துங்கள்.",
      ),
    },
    {
      icon: Waypoints,
      title: L("Profile-aware routing", "தேவைக்கேற்ற வழிகாட்டல்"),
      body: L(
        "A* search over a modelled footpath graph. Wheelchair, walking-aid, general and low-vision profiles each change costs and hard limits — and unknown data is never called accessible.",
        "நடைபாதை வரைபடத்தில் A* தேடல். ஒவ்வொரு தேவைக்கும் வெவ்வேறு விதிகள்; தெரியாத தரவு அணுகக்கூடியது எனக் கூறப்படாது.",
      ),
    },
    {
      icon: Hourglass,
      title: L("Verification with freshness", "புதுமையுடன் சரிபார்ப்பு"),
      body: L(
        "Reports move from pending to confirmed, disputed or resolved through independent votes. Temporary barriers decay — floods after 2 days, debris after 14 — and ask to be re-checked.",
        "பதிவுகள் சுயாதீன வாக்குகள் மூலம் நிலை மாறும். தற்காலிகத் தடைகள் காலப்போக்கில் பழையதாகி மீண்டும் சரிபார்ப்பைக் கோரும்.",
      ),
    },
    {
      icon: ListChecks,
      title: L("Data-gap missions & civic summaries", "தரவு இடைவெளிப் பணிகள் & புகார் சுருக்கம்"),
      body: L(
        "Every route shows a data-confidence score and the exact checks that would raise it. Hotspots turn into ready-to-paste grievance summaries for local authorities.",
        "ஒவ்வொரு வழிக்கும் தரவு நம்பகத்தன்மை மதிப்பெண் மற்றும் தேவையான சரிபார்ப்புகள். முக்கிய இடங்களுக்குப் புகார் சுருக்கம்.",
      ),
    },
  ];

  const steps = [
    { icon: MapPinned, t: L("Choose start, destination and your mobility profile", "தொடக்கம், சேருமிடம், உங்கள் தேவையைத் தேர்வுசெய்க") },
    { icon: Waypoints, t: L("Compare the shortest route with the best match — with reasons and uncertainty", "குறுகிய வழியையும் ஏற்ற வழியையும் காரணங்களுடன் ஒப்பிடுக") },
    { icon: Camera, t: L("Spot a new barrier? Photo → AI suggestion → you confirm", "புதிய தடையா? புகைப்படம் → AI பரிந்துரை → நீங்கள் உறுதிசெய்க") },
    { icon: ClipboardCheck, t: L("Neighbours verify, dispute or mark it fixed — routes update", "அண்டை வீட்டார் சரிபார்க்கின்றனர் — வழிகள் புதுப்பிக்கப்படும்") },
  ];

  return (
    <div>
      {/* ---------------- hero ---------------- */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <p className="eyebrow">{L("AI for Better Living & Smarter Communities · Chennai pilot", "சிறந்த வாழ்வுக்கான AI · சென்னை முன்னோட்டம்")}</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-700">{t("heroBody")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary px-6 text-lg">
              {t("ctaRoute")} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/report" className="btn-secondary px-6 text-lg">
              <Camera className="h-5 w-5" aria-hidden="true" /> {t("ctaReport")}
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[15px] text-mute">
            <Languages className="h-5 w-5" aria-hidden="true" />
            {L("Tamil and English · voice reporting where your browser supports it · no account needed", "தமிழ் மற்றும் ஆங்கிலம் · குரல் பதிவு · கணக்கு தேவையில்லை")}
          </p>
        </div>
        <HeroFigure />
      </section>

      {/* ---------------- problem ---------------- */}
      <section aria-labelledby="problem-h" className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#7FE0D6]">{L("The problem", "பிரச்சினை")}</p>
            <h2 id="problem-h" className="mt-2 text-3xl font-bold leading-tight">{L("Navigation apps find destinations. They rarely know if you can get there.", "வழிகாட்டி செயலிகள் இடத்தைக் காட்டுகின்றன. நீங்கள் அங்கு செல்ல முடியுமா என்பது அவற்றுக்குத் தெரியாது.")}</h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              [L("Stairs-only crossings", "படிகள் மட்டும் உள்ள கடவைகள்"), L("Footbridges and subways without lifts or ramps cut step-free routes in two.", "லிஃப்ட் / சாய்வுதளம் இல்லாத நடைமேம்பாலங்கள் படியில்லா வழிகளைத் துண்டிக்கின்றன.")],
              [L("Broken and blocked footpaths", "உடைந்த, அடைபட்ட நடைபாதைகள்"), L("Missing slabs, parked vehicles on ramps and construction debris push people onto the road.", "காணாமல் போன கற்கள், சாய்வுதளத்தில் வாகனங்கள், கட்டுமானக் குப்பை.")],
              [L("Monsoon waterlogging", "மழைக்கால நீர் தேக்கம்"), L("Conditions change daily, so a report from last week may already be wrong.", "நிலைமை தினமும் மாறுகிறது; கடந்த வாரப் பதிவு இன்று தவறாக இருக்கலாம்.")],
              [L("One size doesn't fit all", "எல்லோருக்கும் ஒரே தீர்வு இல்லை"), L("A few steps with a handrail may be fine for one person and impossible for another.", "கைப்பிடியுடன் சில படிகள் ஒருவருக்குச் சரி, இன்னொருவருக்கு முடியாதது.")],
            ].map(([h, b]) => (
              <li key={h} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="font-bold">{h}</p>
                <p className="mt-1 text-[15px] text-white/80">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section aria-labelledby="how-h" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <p className="eyebrow">{L("How it works", "எப்படி வேலை செய்கிறது")}</p>
        <h2 id="how-h" className="mt-2 text-3xl font-bold">{L("One loop: route → report → verify → better routes", "ஒரு சுழற்சி: வழி → பதிவு → சரிபார்ப்பு → சிறந்த வழிகள்")}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={i} className="card relative">
              <span className="absolute -top-3 left-5 rounded-full bg-teal px-2.5 py-0.5 text-sm font-bold text-white">{i + 1}</span>
              <s.icon className="h-8 w-8 text-teal-700" aria-hidden="true" />
              <p className="mt-3 font-bold leading-snug">{s.t}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- features ---------------- */}
      <section aria-labelledby="feat-h" className="bg-[#F4F8F8]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow">{L("What's different", "என்ன வித்தியாசம்")}</p>
          <h2 id="feat-h" className="mt-2 max-w-3xl text-3xl font-bold">
            {L("Not the first accessibility map — a locally focused combination that's honest about uncertainty.", "முதல் அணுகல் வரைபடம் அல்ல — நிச்சயமின்மையை நேர்மையாகச் சொல்லும் உள்ளூர் கலவை.")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-50"><f.icon className="h-6 w-6 text-teal-700" aria-hidden="true" /></span>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-[15px] text-navy-700">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- AI + verification ---------------- */}
      <section aria-labelledby="verify-h" className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{L("Community verification", "சமூகச் சரிபார்ப்பு")}</p>
          <h2 id="verify-h" className="mt-2 text-3xl font-bold">{L("AI suggests. People decide.", "AI பரிந்துரைக்கிறது. மக்கள் முடிவு செய்கிறார்கள்.")}</h2>
          <p className="mt-3 text-navy-700">
            {L(
              "The AI only describes what is visible in a photo. It never identifies people, never infers health conditions and never declares a route safe. One prediction can't confirm a barrier on its own.",
              "AI புகைப்படத்தில் தெரிவதை மட்டுமே விவரிக்கிறது. நபர்களை அடையாளம் காணாது, உடல்நிலையை ஊகிக்காது, வழி பாதுகாப்பானது என அறிவிக்காது.",
            )}
          </p>
          <ul className="mt-5 grid gap-3">
            <li className="flex gap-3"><Sparkles className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" /><span>{L("Structured output — category, severity, confidence, evidence, uncertainty — validated on the server.", "கட்டமைக்கப்பட்ட வெளியீடு — சேவையகத்தில் சரிபார்க்கப்படுகிறது.")}</span></li>
            <li className="flex gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" /><span>{L("Below 60% confidence the app requires human review instead of pre-filling an answer.", "60%க்குக் குறைவான நம்பகத்தன்மையில் மனிதச் சரிபார்ப்பு கட்டாயம்.")}</span></li>
            <li className="flex gap-3"><Camera className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" /><span>{L("Photos are re-encoded in your browser, removing location metadata, and stored privately.", "புகைப்படங்கள் உங்கள் உலாவியிலேயே மறுகுறியாக்கம் செய்யப்பட்டு இருப்பிடத் தரவு நீக்கப்படுகிறது.")}</span></li>
          </ul>
        </div>
        <figure className="card tactile p-0">
          <div className="m-4 rounded-xl bg-white p-5">
            <figcaption className="font-bold">{L("Report lifecycle", "பதிவின் வாழ்க்கைச் சுழற்சி")}</figcaption>
            <ol className="mt-4 grid gap-3 text-[15px]">
              {[
                ["?", "border-dashed border-amber text-[#7A3A06]", L("Pending", "சரிபார்ப்பில்"), L("New report (AI or manual). Routing treats it as uncertain.", "புதிய பதிவு. நிச்சயமற்றதாகக் கருதப்படும்.")],
                ["!", "border-[#7A1A12] bg-danger text-white", L("Confirmed", "உறுதிசெய்யப்பட்டது"), L("2 independent “still there” votes, or a moderator. Full routing penalty.", "2 சுயாதீன வாக்குகள் அல்லது நிர்வாகி.")],
                ["~", "border-dashed border-[#5B3A9E] bg-[#EEE8FA] text-[#5B3A9E]", L("Disputed", "சர்ச்சையில்"), L("2+ “not accurate” votes outnumber confirmations.", "2+ “சரியல்ல” வாக்குகள்.")],
                ["✓", "border-ok bg-ok-100 text-ok", L("Resolved", "சரிசெய்யப்பட்டது"), L("2 “it's fixed” votes. Ignored by routing; can be re-opened.", "2 “சரிசெய்யப்பட்டது” வாக்குகள்.")],
              ].map(([g, cls, h, b]) => (
                <li key={h} className="flex gap-3">
                  <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[3px] font-bold ${cls}`}>{g}</span>
                  <span><strong>{h}</strong> — {b}</span>
                </li>
              ))}
            </ol>
          </div>
        </figure>
      </section>

      {/* ---------------- honesty + CTA ---------------- */}
      <section aria-labelledby="honest-h" className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 rounded-3xl border-2 border-navy/10 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <h2 id="honest-h" className="text-2xl font-bold">{L("What we don't claim", "நாங்கள் கூறாதவை")}</h2>
            <ul className="mt-3 grid gap-1.5 text-[15px] text-navy-700">
              <li>• {L("This pilot's map and seeded reports are synthetic demonstration data, not verified local conditions.", "இந்த முன்னோட்டத் தரவு செயற்கையானது; சரிபார்க்கப்பட்ட உள்ளூர் நிலை அல்ல.")}</li>
              <li>• {L("Routes are suggestions based on available data — never a safety guarantee.", "வழிகள் கிடைக்கும் தரவின் அடிப்படையிலான பரிந்துரைகள் மட்டுமே.")}</li>
              <li>• {L("We don't estimate walking times: pace varies too much between people to be honest about it.", "நடை நேரத்தை மதிப்பிடுவதில்லை — ஒவ்வொருவரின் வேகமும் வேறுபடும்.")}</li>
              <li>• {L("Low-vision guidance is limited to mapped crossings and tactile paving, and says so.", "குறைந்த பார்வை வழிகாட்டல் வரைபடத் தரவுக்கு மட்டுமே உட்பட்டது.")}</li>
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <Link href="/map" className="btn-primary text-lg">{t("ctaRoute")}</Link>
            <Link href="/dashboard" className="btn-secondary">{L("See the community dashboard", "சமூகத் தகவல் பலகையைப் பார்")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
