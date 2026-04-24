export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">How It Works</h1>
      <p className="text-sm text-gray-500 mb-8">
        End-to-end pipeline: from adding an account to booking a pilot meeting.
      </p>

      {/* Pipeline */}
      <div className="flex flex-col gap-0">
        <Step
          number={1}
          title="Find & Import Facilities"
          color="blue"
          description="Search the CMS Care Compare database (every SNF in the US) or upload a CSV / paste email addresses."
          details={[
            "CMS Search: filter by state, city, ownership type, min beds — all data sourced directly from Medicare",
            "Each result shows beds, CMS star rating, nurse turnover %, RN turnover %, penalties, and fines",
            "Select facilities and Import — all CMS quality data is carried through, no re-lookup needed",
            "CSV upload and email paste also supported for manual lists",
          ]}
          tag="Search SNFs page"
        />

        <Connector />

        <Step
          number={2}
          title="ICP & Priority Scoring"
          color="indigo"
          description="Every imported facility is scored on two axes: ICP fit (is it the right type of customer?) and Priority (how urgently do they need Owle?)."
          details={[
            "ICP Score 0–100 — fit: 90–100 = confirmed SNF ≥60 beds, 60–89 = likely SNF, <60 = marginal or excluded",
            "Priority Score 0–100 — pain signals stacked: nurse turnover ≥75% (+35), 1-star CMS rating (+30), 5+ penalties (+25), RN turnover ≥50% (+20)",
            "Low stars + high turnover + penalties = highest priority (facility is actively struggling)",
            "Recommendation: pursue → in_outreach, pause → held, exclude → removed from pipeline",
          ]}
          tag="Agent node"
        />

        <Connector />

        <Step
          number={3}
          title="Stakeholder Mapper"
          color="violet"
          description="Claude identifies the right people to contact at the facility."
          details={[
            "Infers decision-makers: Administrator, DON, CFO, IT Director",
            "Assigns each contact a role and outreach channel (email or LinkedIn)",
            "Contacts are stored on the account for the next step",
          ]}
          tag="Agent node"
        />

        <Connector />

        <Step
          number={4}
          title="Strategy Decider"
          color="purple"
          description="Claude picks the best outreach angle based on account data and contacts."
          details={[
            "Chooses between email-first or LinkedIn-first",
            "Selects a value proposition (documentation burden, staffing, care coordination)",
            "Sets tone and urgency of the message",
          ]}
          tag="Agent node"
        />

        <Connector />

        <Step
          number={5}
          title="Outreach Generator"
          color="pink"
          description="Claude drafts a personalised email and LinkedIn message using the strategy."
          details={[
            "Email: subject line + body tailored to the facility and contact",
            "LinkedIn: shorter connection request message",
            "Both reference specific facts from the account data",
          ]}
          tag="Agent node"
        />

        <Connector />

        <Step
          number={6}
          title="Human-in-the-Loop (HITL) Review"
          color="rose"
          description="The pipeline pauses. You review the draft in the Approval Queue before anything is sent."
          details={[
            "Approve → email is sent via Gmail API, LinkedIn message is shown for manual sending",
            "Reject → draft is discarded, account stays in queue",
            "Nothing is sent without your explicit approval",
          ]}
          tag="Approval Queue page"
        />

        <Connector />

        <Step
          number={7}
          title="Reply Classifier"
          color="orange"
          description="When a reply comes in (via Gmail webhook), Claude classifies it automatically."
          details={[
            "Classifications: interested / not_interested / out_of_office / question / unsubscribe",
            "Confidence score 0–1 attached to every classification",
            "Unsubscribes are flagged and excluded from future outreach",
          ]}
          tag="Reply Inbox page"
        />

        <Connector />

        <Step
          number={8}
          title="Meeting Booker"
          color="amber"
          description="For interested replies, Claude drafts a follow-up proposing a pilot meeting."
          details={[
            "Proposes a 30-min discovery call",
            "References the original outreach context",
            "Meeting status is tracked on the account (proposed / booked / declined)",
          ]}
          tag="Agent node"
        />

        <Connector />

        <Step
          number={9}
          title="Learning Updater"
          color="green"
          description="After each completed run, Claude reflects on what worked and updates the strategy knowledge."
          details={[
            "Writes a structured audit log entry for every node",
            "Identifies patterns across accounts (which angles get replies)",
            "Future runs benefit from accumulated context",
          ]}
          tag="Agent node"
        />
      </div>

      {/* Stack */}
      <div className="mt-12 border rounded-xl p-6 bg-white">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Tech Stack</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["LLM", "Claude claude-sonnet-4-6 (Anthropic)"],
            ["Agent Framework", "LangGraph 0.2"],
            ["API", "FastAPI + Uvicorn"],
            ["Database", "Supabase (Postgres)"],
            ["Checkpointer", "LangGraph Postgres checkpoint"],
            ["Email", "Gmail API (OAuth)"],
            ["LinkedIn", "Human-in-the-loop (agent drafts, you send)"],
            ["Observability", "LangSmith tracing"],
            ["Frontend", "Next.js 14 + Tailwind + shadcn/ui"],
            ["Deployment", "Render (backend) + Vercel (frontend)"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-gray-400 w-36 shrink-0">{label}</span>
              <span className="text-gray-700">{value}</span>
            </div>
          ))}
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
  pink:   "bg-pink-600",
  rose:   "bg-rose-600",
  orange: "bg-orange-500",
  amber:  "bg-amber-500",
  green:  "bg-green-600",
};

function Step({
  number, title, color, description, details, tag,
}: {
  number: number;
  title: string;
  color: string;
  description: string;
  details: string[];
  tag: string;
}) {
  return (
    <div className={`border rounded-xl p-5 bg-white`}>
      <div className="flex items-start gap-4">
        <div className={`${numberColorMap[color]} text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-0.5`}>
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorMap[color]}`}>
              {tag}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <ul className="flex flex-col gap-1">
            {details.map((d) => (
              <li key={d} className="text-xs text-gray-500 flex gap-2">
                <span className="text-gray-300 mt-0.5">▸</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
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
