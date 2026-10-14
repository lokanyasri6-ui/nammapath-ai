# NammaPath AI — judge summary

**One line:** A Tamil/English web app that suggests pedestrian routes matched to a person's mobility needs, using AI-assisted photo reports that the community verifies — and that says plainly what it doesn't know.

**Problem.** Broken footpaths, stairs-only footbridges, blocked ramps and monsoon flooding make ordinary walking routes hard or impossible for wheelchair users, people with walking aids, older people and people with low vision. Navigation apps are built to reach a destination; conditions on the ground change daily; and one route doesn't suit every body.

**What we built (working MVP, not a mock-up).**

| | |
|---|---|
| **Profile-aware routing** | Real A* search over an explicit footpath graph. Four profiles (wheelchair / walking aid / general / low-vision) change both costs and hard limits. Returns *Shortest* vs *Best match* with reasons, data-confidence score and uncertainty. Explains when no supported route exists. |
| **AI-assisted reporting** | Photo → Gemini vision (structured JSON: category, severity, confidence, evidence, uncertainty) → Zod-validated → < 60 % confidence forces human review → reporter confirms or corrects. Works without AI (manual) and in a clearly-labelled demo mode. |
| **Community verification + freshness** | Pending → Confirmed / Disputed / Resolved by independent votes or a moderator; temporary barriers decay (flooding 2 days, debris 14) and ask for re-verification. One AI prediction can never confirm a barrier. |
| **Data gaps → action** | Each route lists "verification missions" (the exact unknowns to check). Dashboard hotspots generate a ready-to-paste civic complaint summary. |
| **Local** | Tamil + English UI, Tamil/English voice description, spoken directions, Chennai (Mylapore) pilot. |
| **Responsible by design** | No accounts or medical data; EXIF stripped in the browser; private photo storage; keys server-side only; rate limits; synthetic data labelled everywhere; no fabricated walking times or safety guarantees. |

**Proof it works:** 39 unit/API tests + 16 Playwright browser tests (desktop + mobile) pass; production build clean; Supabase schema + seed executed on Postgres/PostGIS.

**Honest positioning.** Google Maps (stair-free walking routes where data exists, accessible-place icons), AccessNow (crowdsourced place ratings), Project Sidewalk (remote sidewalk audits) and AccessMap (personalised sidewalk routing) already exist. Our contribution is the *combination* for an Indian neighbourhood: on-the-ground AI-assisted photo reports → time-aware community verification → routing that consumes those reports and is transparent about uncertainty → civic follow-up. Sources in the README.

---

## 3-minute demo script

**Before you start:** `npm run build && npm start`. Open `/` in one tab and `/map` in another. If you have a Gemini key, set it so the header says "AI: live"; otherwise point at the demo banner and say so.

| Time | Do | Say |
|---|---|---|
| 0:00 | Landing page, point at the hero illustration and the yellow banner | "Navigation apps find destinations; they rarely know if *you* can get there. This pilot uses synthetic data — we label it everywhere, and we never call unknown data accessible." |
| 0:20 | `/map` → "Bus Stop → Health Centre" quick link, profile **General** | "Shortest is 734 m — over this footbridge." |
| 0:35 | Switch profile to **Wheelchair** | "Same trip, wheelchair profile: 1,536 m, 109 % longer — and it tells you *why*: it avoids a confirmed stairs-only footbridge. Data confidence 100 %, and it still says 'not a guarantee'." Click the *Shortest* tab: "Shown for comparison, flagged as conflicting with your needs." |
| 1:00 | Quick link "School → Park" | "Here one segment's steps are unknown. We return a route but refuse to call it step-free — and we turn that gap into a verification mission for volunteers." |
| 1:15 | Quick link "Bus Stop → Market Upper Level" | "Only reachable by stairs. We say so instead of inventing a route." |
| 1:25 | `/report` → click the **Flooding** sample → click the map on the east footpath of the main road (south side, between the crossings) → severity **High** → (optional) tap the mic and say "தண்ணீர் தேங்கியுள்ளது" | "Photo is re-encoded in the browser so GPS metadata never leaves the phone. The AI suggests waterlogging with confidence and evidence — in demo mode it says plainly it's simulated. I confirm it. Tamil voice works too." Submit. |
| 1:55 | Point at "submitted as PENDING", then `/map` (Wheelchair, Bus Stop → Health Centre) | "One report — even a confident AI one — is only *pending*. The route still goes east, but now lists the flood as unconfirmed and drops to 'partly unconfirmed'." |
| 2:05 | `/reports` → on the new report press **Still there** in two different browsers (or use `/moderate` with PIN `demo-moderator` → "Mark confirmed") | "Two independent confirmations, or a moderator, confirm it. Every change is logged." |
| 2:25 | Back to `/map`, Wheelchair, Bus Stop → Health Centre → Find routes | "Now it's confirmed, the step-free route re-routes west around the flood — and it's honest that the new path has another unconfirmed report and an unknown surface. Floods also go stale after 2 days unless someone re-checks." |
| 2:40 | `/dashboard` → hotspot → **Draft civic complaint summary** | "For councillors: hotspots, stale reports, and a ready-to-paste grievance — computed only from stored reports, no invented impact numbers." |
| 2:55 | Toggle **தமிழ்** | "Tamil throughout. Thank you." |

Fallbacks: if Wi-Fi is down, map tiles won't load but routes, markers and all logic still work (the graph is drawn on top). If the mic is blocked, type the description.

---

## Rubric self-assessment (honest)

Scores are our own estimate against criteria commonly used at student AI/social-impact hackathons. They are a judgement, not a measurement.

| Criterion | Score /10 | Why | Biggest lever to raise it |
|---|---|---|---|
| Problem relevance & social impact | 9 | Clear, local, under-served users; ties to monsoon and footbridge realities in Chennai | One quote or short interview with a wheelchair user / disability org in Chennai |
| Innovation / differentiation | 7 | Not first-of-kind; the combination (AI photo → verified, time-decaying reports → uncertainty-aware routing → civic summary) is distinctive, and we're upfront about prior art | Show 1–2 *real* Mylapore photos classified live by Gemini |
| Technical execution | 9 | Real A*, profile cost model, validated AI pipeline, RLS schema, 55 automated tests, clean build | Deploy to a public URL (Vercel) with Supabase so judges can try it on their phones |
| Responsible AI & trust | 9 | Human-in-the-loop, confidence thresholds, no PII/medical data, EXIF stripping, synthetic-data labelling | Mention a plan to measure AI precision against volunteer labels |
| UX & accessibility | 8 | Atkinson Hyperlegible type, 48 px targets, keyboard + screen-reader labels, status never colour-only, Tamil | Run a quick Lighthouse/axe pass on the deployed URL and quote the score |
| Feasibility & scalability | 7 | Clear path to a ward-level pilot; graph is synthetic today | Import one real street from OpenStreetMap and audit it on foot |
| Demo / presentation | 8 (if rehearsed) | The 3-minute script shows a full loop with a visible re-route | Rehearse twice; have a backup screen recording |

**Winning chances.** Nobody can calculate this — it depends on the other teams, the judges and the room. Our honest read: with a rehearsed demo, this is a **strong top-3 contender** in a typical student hackathon judged on impact, AI use and execution, because it shows a complete, working, responsible loop rather than slides. The things that most often decide the winner at this level — and that are still within reach — are:

1. **Real data, even a little:** a few real photos from one Mylapore street classified live by Gemini, and one real footpath segment added to the graph.
2. **A real user voice:** a 15-second quote from a wheelchair user, an elderly resident or a disability-rights group.
3. **A public link:** deploy to Vercel so judges can open it on their phones during Q&A.
4. **A crisp opening line:** "734 m for most people, 1,536 m if you use a wheelchair — and today no app tells you which."
