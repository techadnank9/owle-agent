export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">How Owle Works</h1>
      <p className="text-sm text-gray-500 mb-6">
        A fully automated outreach pipeline — from finding a facility to booking a pilot meeting.
        You only need to approve the email before it sends.
      </p>

      {/* Big picture */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-8">
        <p className="text-sm font-semibold text-blue-900 mb-2">What Owle automates end-to-end</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🏥", label: "Find the right SNFs", sub: "CMS quality signals" },
            { icon: "👤", label: "Find the right contact", sub: "Hunter · Apollo · Apify" },
            { icon: "✉️", label: "Write a personalised email", sub: "Claude AI" },
            { icon: "✅", label: "You approve it", sub: "Nothing sends without you" },
            { icon: "📬", label: "Send & classify replies", sub: "Gmail API" },
            { icon: "📅", label: "Book the meeting", sub: "Google Calendar" },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-white rounded-lg px-3 py-3 border border-blue-100">
              <p className="text-xl mb-1">{icon}</p>
              <p className="text-xs font-semibold text-gray-800 leading-snug">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg px-4 py-3 border border-green-100">
            <p className="text-xs font-semibold text-green-700 mb-1.5">Automated by Owle</p>
            <ul className="flex flex-col gap-1">
              {["ICP scoring + priority ranking","Finding email addresses","Drafting personalised emails","Classifying replies","Meeting follow-ups","Audit logging"].map(t => (
                <li key={t} className="text-xs text-gray-600 flex gap-1.5"><span className="text-green-500">✓</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg px-4 py-3 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">Done by you</p>
            <ul className="flex flex-col gap-1">
              {["Approve or reject the email draft","Send LinkedIn messages manually","Confirm meeting details","Review reply response drafts"].map(t => (
                <li key={t} className="text-xs text-gray-600 flex gap-1.5"><span className="text-amber-500">→</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="flex flex-col gap-0">
        <Step
          number={1}
          title="Find & Import Facilities"
          color="blue"
          tag="Search SNFs page"
          description="Search the CMS Care Compare database — every skilled nursing facility in the US — and import the ones that match your ICP."
          details={[
            "Filter by state, city, ownership type, and minimum bed count directly from Medicare's public data",
            "Each result shows: beds, CMS star rating, nurse turnover %, RN turnover %, total penalties, and penalty fines",
            "Star rating 1–5: 1 star = bottom 20% nationally (most likely to need Owle)",
            "Nurse turnover ≥75% and penalties = highest pain signal — these facilities are actively struggling with staffing",
            "Select any number of facilities and click Import — all CMS quality data carries through automatically",
            "Also supports: CSV upload or paste a list of emails for manual prospect lists",
          ]}
          note="All CMS data is sourced live from Medicare. No manual research needed."
        />

        <Connector />

        <Step
          number={2}
          title="ICP & Priority Scoring"
          color="indigo"
          tag="Agent · account_selector"
          description="Every imported facility is scored on two dimensions: ICP fit (is this the right type of customer?) and Priority (how urgently do they need Owle right now?)."
          details={[
            "ICP Score 0–100 — facility fit: 90–100 = confirmed SNF ≥60 beds, 60–89 = likely fit, <60 = marginal",
            "Priority Score 0–100 — pain signals stacked: nurse turnover ≥75% (+35 pts), 1-star CMS rating (+30 pts), 5+ penalties (+25 pts), RN turnover ≥50% (+20 pts)",
            "Low stars + high turnover + multiple penalties = highest priority — facility is actively struggling",
            "Outcome: pursue (→ moves to outreach), pause (→ held), exclude (→ removed from pipeline)",
            "Score is recalculated each agent run — if new CMS data comes in, priority updates",
          ]}
          note="The agent focuses your time on accounts most likely to convert. High-pain accounts get contacted first."
        />

        <Connector />

        <Step
          number={3}
          title="Stakeholder Mapping"
          color="violet"
          tag="Agent · stakeholder_mapper"
          description="Claude identifies the right people to contact at the facility — by role, not just by name."
          details={[
            "Target roles: Administrator (primary decision-maker), Director of Nursing (DON), CFO, IT Director",
            "Uses the facility name and location to infer likely contacts via Claude reasoning",
            "Assigns each contact a primary outreach channel: email or LinkedIn",
            "Contacts are stored on the account and reused across future runs — no repeat lookups",
          ]}
          note="Most SNFs have 2–4 decision-makers. Owle maps all of them and picks the best one to start with."
        />

        <Connector />

        <Step
          number={4}
          title="Web Enrichment"
          color="purple"
          tag="Agent · web_enricher"
          description="Owle searches the web for facility-specific context to make the outreach message feel genuinely personalised — not templated."
          details={[
            "Searches for: facility website, recent news mentions, reviews, staffing announcements",
            "Extracts: what services the facility offers, what challenges they publicly mention, any recent awards or problems",
            "This context is injected into the email draft — the AI references specific facts about the facility",
            "Source: Tavily search API (1,000 free searches/mo — sufficient for most volumes)",
          ]}
          note="This is what makes emails feel hand-written. The AI reads the facility's own website before drafting."
        />

        <Connector />

        <Step
          number={5}
          title="Contact Enrichment"
          color="sky"
          tag="Agent · contact enrichment"
          description="Owle finds real, verified email addresses and LinkedIn URLs for each contact — using a waterfall of three data sources."
          details={[
            "Step 1 — Hunter.io: searches by domain (e.g. sunnydalecare.com → finds admin@sunnydalecare.com). Best for domain-verified emails. 2,000 searches/mo on Starter ($49/mo).",
            "Step 2 — Apollo.io: if Hunter finds nothing, searches 275M contact database by name + company. Returns email + LinkedIn URL. 2,500 credits/mo on Basic ($49/mo annual).",
            "Step 3 — Apify: fallback web scraping if both above fail. Uses easy-email-finder actor. Near-zero cost for low volume. Starter $29/mo.",
            "Results are deduplicated by email — if Hunter and Apollo find the same address, it's stored once",
            "LinkedIn URLs from Apollo enable the parallel LinkedIn outreach workflow",
          ]}
          note="The waterfall order is Hunter → Apollo → Apify. Each step is only tried if the previous one finds nothing. You pay only what you need."
        />

        <Connector />

        <Step
          number={6}
          title="Outreach Generation"
          color="pink"
          tag="Agent · outreach_generator"
          description="Claude writes a personalised email and LinkedIn message using everything gathered in the previous steps."
          details={[
            "Email subject line: specific to the facility — references their CMS rating, turnover, or a specific pain point",
            "Email body: 3–4 sentences, references the facility's own situation (e.g. '75% nurse turnover last year')",
            "Tone: direct and founder-led — not a mass marketing blast",
            "LinkedIn message: shorter connection request version of the same angle",
            "No templates — each message is generated fresh from the account's actual data",
            "Multiple contacts at the same facility get different messages tailored to their role (DON vs CFO)",
          ]}
          note="The AI references real data: CMS star rating, turnover %, penalties. That specificity is why open rates are higher."
        />

        <Connector />

        <Step
          number={7}
          title="Human-in-the-Loop Review"
          color="rose"
          tag="Approval Queue"
          description="The pipeline pauses here. You review every email draft before it sends. Nothing goes out without your explicit approval."
          details={[
            "Approve → email is sent immediately via Gmail API from your own address",
            "Edit before approving → you can rewrite any part of the draft inline",
            "Reject → draft is discarded, account returns to queue for re-run",
            "LinkedIn message is shown alongside — copy it and send manually from your LinkedIn",
            "Approved accounts move to status: 'in_outreach' and are tracked in the pipeline",
          ]}
          note="You stay in control of every message. The AI does the research and writing; you make the final call."
        />

        <Connector />

        <Step
          number={8}
          title="Reply Classification"
          color="orange"
          tag="Reply Inbox · reply_classifier"
          description="When a reply comes in via Gmail, Claude reads it and classifies the intent automatically — no manual triage."
          details={[
            "Classifications: interested / not_interested / question / out_of_office / unsubscribe",
            "Confidence score 0.0–1.0 attached to every classification",
            "For 'interested' replies: Claude drafts a follow-up response you can approve and send",
            "For 'question' replies: Claude drafts an answer based on Owle's product context",
            "Unsubscribes are flagged immediately — account is excluded from all future outreach",
            "Out-of-office replies are noted and the account is queued for a follow-up after a delay",
          ]}
          note="Replies arrive via Gmail webhook — classification happens within seconds of the reply landing."
        />

        <Connector />

        <Step
          number={9}
          title="Meeting Booking"
          color="amber"
          tag="Agent · meeting_booker"
          description="For interested replies, Claude drafts a meeting proposal — a 30-minute pilot discovery call — and tracks the meeting status."
          details={[
            "Proposes 2–3 time slots based on your availability (configurable)",
            "References the original outreach context so the prospect remembers the thread",
            "Meeting status tracked: proposed → confirmed → completed / cancelled",
            "Google Calendar integration: confirmed meetings appear in your calendar automatically",
            "Google Meet link generated and included in the confirmation email",
            "All meetings visible in the Meetings page — calendar view or list view",
          ]}
          note="Once a meeting is confirmed, it appears in both Owle's Meetings page and your Google Calendar."
        />

        <Connector />

        <Step
          number={10}
          title="Audit Log & Learning"
          color="green"
          tag="Agent · learning_updater"
          description="After every agent run, a structured audit entry is written — every decision, every score, every action is logged."
          details={[
            "One audit entry per agent run — includes: ICP score, priority score, contacts found, emails sent, replies received",
            "Visible on the Account Detail page — full history of every action taken on that account",
            "Tracks which outreach angles generated replies vs silence — informs future prioritisation",
            "If a run fails partway through, the audit log shows exactly where and why",
            "Used for debugging, reporting, and improving the agent's strategy over time",
          ]}
          note="Nothing is a black box. Every AI decision is explained and logged in plain language on the account page."
        />
      </div>

      {/* Data sources */}
      <div className="mt-10 border rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Data Sources</h2>
          <p className="text-xs text-gray-500 mt-0.5">Where Owle gets its information at each stage</p>
        </div>
        <div className="divide-y">
          {[
            { source: "CMS Care Compare", what: "15,000+ US SNFs — beds, star rating, nurse turnover, penalties, fines", cost: "Free (public Medicare API)", stage: "Step 1" },
            { source: "Tavily Search", what: "Facility website, news mentions, service descriptions for personalisation", cost: "Free tier: 1,000 searches/mo", stage: "Step 4" },
            { source: "Hunter.io", what: "Domain-verified email addresses — best accuracy for corporate emails", cost: "Outreach Platform Starter: $49/mo — 2,000 searches", stage: "Step 5 (primary)" },
            { source: "Apollo.io", what: "275M contact database — emails + LinkedIn URLs by name + company", cost: "Basic: $49/mo annual — 2,500 credits/mo", stage: "Step 5 (fallback)" },
            { source: "Apify", what: "Web scraping fallback — finds emails when Hunter + Apollo both fail", cost: "Starter: $29/mo — pay per use", stage: "Step 5 (last resort)" },
            { source: "Claude (Anthropic)", what: "All AI reasoning — scoring, mapping, writing, classifying", cost: "~$10–20/mo at typical volume", stage: "Steps 2–9" },
          ].map(row => (
            <div key={row.source} className="px-5 py-3 flex items-start gap-4">
              <div className="w-32 shrink-0">
                <p className="text-xs font-semibold text-gray-800">{row.source}</p>
                <p className="text-xs text-gray-400">{row.stage}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">{row.what}</p>
              </div>
              <div className="w-48 shrink-0 text-right">
                <p className="text-xs text-gray-500">{row.cost}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Tech Stack</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          {[
            ["LLM", "Claude claude-sonnet-4-6 (Anthropic)"],
            ["Agent Framework", "LangGraph 0.2"],
            ["API Server", "FastAPI + Uvicorn (Python)"],
            ["Database", "Supabase (Postgres)"],
            ["Agent State", "LangGraph Postgres checkpointer"],
            ["Email", "Gmail API (OAuth2 — your account)"],
            ["Calendar", "Google Calendar API"],
            ["LinkedIn", "Human-in-the-loop (you send manually)"],
            ["Observability", "LangSmith tracing"],
            ["Frontend", "Next.js 14 + Tailwind CSS"],
            ["Backend hosting", "Render ($7/mo starter)"],
            ["Frontend hosting", "Vercel (free tier)"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-gray-400 text-xs w-36 shrink-0">{label}</span>
              <span className="text-gray-700 text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost summary */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white mb-8">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Monthly Cost to Run Owle</h2>
          <p className="text-xs text-gray-500 mt-0.5">Phase 1 — full working pipeline</p>
        </div>
        <div className="divide-y">
          {[
            { item: "Render (backend hosting)", cost: "$7/mo", note: "Starter plan" },
            { item: "Hunter.io", cost: "$49/mo", note: "Outreach Platform Starter — 2,000 searches, API key" },
            { item: "Anthropic (Claude)", cost: "~$10–20/mo", note: "claude-sonnet-4-6, varies by volume" },
            { item: "Tavily Search", cost: "$0", note: "Free tier — 1,000 searches/mo" },
            { item: "Vercel (frontend)", cost: "$0", note: "Free tier" },
          ].map(row => (
            <div key={row.item} className="px-5 py-2.5 flex items-center gap-4">
              <p className="text-xs font-medium text-gray-800 flex-1">{row.item}</p>
              <p className="text-xs font-bold text-gray-900 w-24 text-right">{row.cost}</p>
              <p className="text-xs text-gray-400 w-64 text-right">{row.note}</p>
            </div>
          ))}
          <div className="px-5 py-3 bg-blue-50 flex items-center gap-4">
            <p className="text-xs font-bold text-blue-900 flex-1">Total Phase 1</p>
            <p className="text-xs font-bold text-blue-900 w-24 text-right">$66–76/mo</p>
            <p className="text-xs text-blue-700 w-64 text-right">Without Apollo or Apify</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50 border-blue-200 text-blue-700",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  sky:    "bg-sky-50 border-sky-200 text-sky-700",
  pink:   "bg-pink-50 border-pink-200 text-pink-700",
  rose:   "bg-rose-50 border-rose-200 text-rose-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  amber:  "bg-amber-50 border-amber-200 text-amber-700",
  green:  "bg-green-50 border-green-200 text-green-700",
};

const numberColorMap: Record<string, string> = {
  blue:   "bg-blue-600",
  indigo: "bg-indigo-600",
  violet: "bg-violet-600",
  purple: "bg-purple-600",
  sky:    "bg-sky-500",
  pink:   "bg-pink-600",
  rose:   "bg-rose-600",
  orange: "bg-orange-500",
  amber:  "bg-amber-500",
  green:  "bg-green-600",
};

function Step({
  number, title, color, description, details, tag, note,
}: {
  number: number;
  title: string;
  color: string;
  description: string;
  details: string[];
  tag: string;
  note?: string;
}) {
  return (
    <div className="border rounded-xl p-5 bg-white">
      <div className="flex items-start gap-4">
        <div className={`${numberColorMap[color]} text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-0.5`}>
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorMap[color]}`}>
              {tag}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <ul className="flex flex-col gap-1 mb-3">
            {details.map((d) => (
              <li key={d} className="text-xs text-gray-500 flex gap-2">
                <span className="text-gray-300 mt-0.5 shrink-0">▸</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          {note && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Note: </span>{note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-start pl-8">
      <div className="w-px h-5 bg-gray-200" />
    </div>
  );
}
