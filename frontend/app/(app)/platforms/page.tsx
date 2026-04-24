"use client";
import { useState } from "react";

// ─── Owle Phase Data ──────────────────────────────────────────────────────────

const PHASES = [
  {
    id: 1,
    label: "Phase 1 — Start Now",
    sublabel: "Get Owle fully working · <100 leads/mo",
    color: "blue",
    total: "~$66–76/mo",
    items: [
      {
        service: "Render",
        plan: "Starter Web Service",
        cost: "$7/mo",
        status: "required" as const,
        why: "Backend (FastAPI) stays always-on. Free tier spins down after 15 min inactivity — pay $7 to fix.",
        link: "https://render.com/pricing",
      },
      {
        service: "Hunter.io",
        plan: "Outreach Platform — Starter",
        cost: "$49/mo",
        status: "buy-now" as const,
        why: "Primary contact source. 2,000 domain searches/mo via API. Finds all emails at a company by domain. API included on all paid plans.",
        link: "https://hunter.io/pricing",
        note: "⚠ Use Outreach Platform ($49/mo subscription) — NOT the Data Platform (pay-as-you-go bulk credits, ~$6,500+ for 1k searches).",
      },
      {
        service: "Anthropic",
        plan: "Pay-as-you-go",
        cost: "~$10–20/mo",
        status: "active" as const,
        why: "Claude Sonnet 4.6 for ICP scoring, email drafts, reply classification, stakeholder mapping. ~$0.05/account at 100 accounts/mo.",
        link: "https://www.anthropic.com/pricing",
      },
      {
        service: "Supabase",
        plan: "Free",
        cost: "$0/mo",
        status: "active" as const,
        why: "Postgres DB + real-time + auth. 500 MB storage, 50k MAU — enough for early stage.",
      },
      {
        service: "Vercel",
        plan: "Hobby",
        cost: "$0/mo",
        status: "active" as const,
        why: "Frontend hosting. Free covers custom domains + unlimited deploys.",
      },
      {
        service: "Gmail API",
        plan: "OAuth2",
        cost: "$0/mo",
        status: "active" as const,
        why: "Send outreach emails + receive replies via webhook. Free within Google quotas.",
      },
      {
        service: "Google Calendar API",
        plan: "OAuth2",
        cost: "$0/mo",
        status: "active" as const,
        why: "Create meeting events + Google Meet links automatically on booking.",
      },
      {
        service: "AgentMail",
        plan: "Free",
        cost: "$0/mo",
        status: "active" as const,
        why: "Managed reply inbox. Free: 3 inboxes, 3,000 emails/mo. Enough for Phase 1 volume.",
      },
      {
        service: "Tavily",
        plan: "Researcher (free)",
        cost: "$0/mo",
        status: "active" as const,
        why: "Web search for company context in web_enricher. 1,000 free searches/mo.",
      },
    ],
  },
  {
    id: 2,
    label: "Phase 2 — Scale Up",
    sublabel: "3 enrichment sources · 100–500 leads/mo",
    color: "indigo",
    total: "~$164–184/mo",
    items: [
      {
        service: "Everything in Phase 1",
        plan: "",
        cost: "~$66–76/mo",
        status: "carry" as const,
        why: "All Phase 1 services continue.",
      },
      {
        service: "Apify",
        plan: "Starter",
        cost: "$29/mo",
        status: "buy-now" as const,
        why: "Fallback contact finder when Hunter finds nothing. $29/mo prepaid credits at $0.20/CU. Easy-email-finder actor ~0.5–1 CU per domain. Free tier ($5) runs out after ~25 lookups.",
        link: "https://apify.com/pricing",
      },
      {
        service: "Apollo.io",
        plan: "Basic",
        cost: "~$49–59/mo",
        status: "buy-now" as const,
        why: "Fixes the 403 error on free plan. Basic unlocks People Search API + Person API for contact lookup — what Owle uses. 1,000 export credits/mo from 275M contact database.",
        link: "https://www.apollo.io/pricing",
        note: "⚠ Pricing page is JS-rendered — no public prices. ~$49/mo annual, ~$59/mo monthly based on public reports. Advanced bulk API needs Custom plan (sales call).",
      },
      {
        service: "Anthropic",
        plan: "Pay-as-you-go",
        cost: "~$20–40/mo",
        status: "scales" as const,
        why: "Higher usage as lead volume grows. ~$0.05/account.",
      },
    ],
  },
  {
    id: 3,
    label: "Phase 3 — Full Growth",
    sublabel: "Production-grade · 500–1,000+ leads/mo",
    color: "violet",
    total: "~$368–468/mo",
    items: [
      {
        service: "Everything in Phase 2",
        plan: "",
        cost: "~$164/mo",
        status: "carry" as const,
        why: "All Phase 2 services continue.",
      },
      {
        service: "Supabase",
        plan: "Pro",
        cost: "$25/mo",
        status: "upgrade" as const,
        why: "Upgrade when DB hits 500 MB. Unlocks 8 GB storage, daily backups, no auto-pausing.",
      },
      {
        service: "AgentMail",
        plan: "Developer",
        cost: "$20/mo",
        status: "upgrade" as const,
        why: "Remove daily reply cap. Needed when reply volume grows beyond free tier limits.",
      },
      {
        service: "Hunter.io",
        plan: "Growth",
        cost: "$149/mo",
        status: "upgrade" as const,
        why: "Upgrade from Starter when 2,000 searches/mo isn't enough. Growth = 10,000 searches/mo.",
      },
      {
        service: "Anthropic",
        plan: "Pay-as-you-go",
        cost: "~$50–100/mo",
        status: "scales" as const,
        why: "Full pipeline at scale — 500–1,000 accounts/mo.",
      },
      {
        service: "Vercel",
        plan: "Pro (optional)",
        cost: "$20/mo",
        status: "optional" as const,
        why: "Only needed when team grows. Adds password protection, team members, analytics.",
      },
    ],
  },
];

const STATUS_STYLE: Record<string, string> = {
  "required":  "bg-red-50 text-red-600 border border-red-200",
  "buy-now":   "bg-blue-50 text-blue-600 border border-blue-200",
  "active":    "bg-green-50 text-green-700 border border-green-200",
  "carry":     "bg-gray-50 text-gray-500 border border-gray-200",
  "upgrade":   "bg-amber-50 text-amber-600 border border-amber-200",
  "scales":    "bg-purple-50 text-purple-600 border border-purple-200",
  "optional":  "bg-gray-50 text-gray-400 border border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  "required": "required",
  "buy-now":  "buy now",
  "active":   "active",
  "carry":    "carry forward",
  "upgrade":  "upgrade",
  "scales":   "scales with usage",
  "optional": "optional",
};

const PHASE_HEADER: Record<string, string> = {
  blue:   "bg-blue-600",
  indigo: "bg-indigo-600",
  violet: "bg-violet-600",
};

// ─── Tool reference data ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "Hunter.io",
    role: "Primary email finder",
    used_by_owle: true,
    owle_plan: "Outreach Platform — Starter",
    owle_cost: "$49/mo",
    api_tier: "All paid plans include API",
    credits: "2,000/mo",
    note: "Two products: Outreach Platform (subscription, API included) vs Data Platform (pay-as-you-go bulk credits, ~$6,500+ for 1k searches). Owle uses Outreach Platform.",
  },
  {
    name: "Apollo.io",
    role: "Contact database + LinkedIn URLs",
    used_by_owle: true,
    owle_plan: "Basic",
    owle_cost: "~$49–59/mo",
    api_tier: "Basic = People Search API. Custom = full advanced API.",
    credits: "1,000 export/mo",
    note: "Free plan returns 403 on all API endpoints. Basic fixes this. Pricing page is JS-rendered — prices unconfirmed from official source.",
  },
  {
    name: "Apify",
    role: "Email scraping fallback",
    used_by_owle: true,
    owle_plan: "Starter",
    owle_cost: "$29/mo",
    api_tier: "All plans (API-first platform)",
    credits: "$29 prepaid at $0.20/CU",
    note: "Pay-as-you-go compute. ~0.5–1 CU per domain lookup. Free tier ($5) runs out after ~25 lookups.",
  },
  {
    name: "Anthropic",
    role: "AI brain (scoring, drafts, classification)",
    used_by_owle: true,
    owle_plan: "Pay-as-you-go",
    owle_cost: "~$10–100/mo",
    api_tier: "API-only product",
    credits: "$3/M input · $15/M output tokens",
    note: "Claude Sonnet 4.6. ~$0.05/account processed through full pipeline.",
  },
  {
    name: "Tavily",
    role: "Web search for company context",
    used_by_owle: true,
    owle_plan: "Researcher (free)",
    owle_cost: "$0/mo",
    api_tier: "Free tier: 1,000 searches/mo",
    credits: "1,000/mo free",
    note: "Used in web_enricher to find company websites + context before scoring.",
  },
  {
    name: "AgentMail",
    role: "Reply inbox (receive inbound emails)",
    used_by_owle: true,
    owle_plan: "Free → Developer",
    owle_cost: "$0 → $20/mo",
    api_tier: "Webhook-based",
    credits: "Free: 3,000 emails/mo",
    note: "Free tier has daily cap. Developer ($20/mo) removes it. Upgrade in Phase 3.",
  },
  {
    name: "Render",
    role: "Backend hosting",
    used_by_owle: true,
    owle_plan: "Starter",
    owle_cost: "$7/mo",
    api_tier: "N/A",
    credits: "N/A",
    note: "Free tier spins down after 15 min inactivity. $7/mo keeps it always-on — required for webhook delivery.",
  },
  {
    name: "Supabase",
    role: "Database + realtime + auth",
    used_by_owle: true,
    owle_plan: "Free → Pro",
    owle_cost: "$0 → $25/mo",
    api_tier: "N/A",
    credits: "Free: 500 MB",
    note: "Free covers early stage. Upgrade to Pro ($25/mo) when DB hits 500 MB or needs daily backups.",
  },
];

// ─── Platform comparison data ─────────────────────────────────────────────────

type Plan = {
  name: string;
  billed_monthly: string;
  billed_annual: string;
  credits: string;
  key_features: string;
};

type Platform = {
  name: string;
  tagline: string;
  color: string;
  plans: Plan[];
  pros: string[];
  cons: string[];
  best_for: string;
  data_note?: string;
  has_phones: boolean;
  has_sequences: boolean;
  entry_monthly: number;
};

const PLATFORMS: Platform[] = [
  {
    name: "Apollo.io",
    tagline: "All-in-one prospecting + outreach",
    color: "bg-orange-500",
    entry_monthly: 49,
    has_phones: true,
    has_sequences: true,
    plans: [
      { name: "Basic", billed_monthly: "$49/mo", billed_annual: "", credits: "1,000 export credits/mo", key_features: "Email sequences, Salesforce/HubSpot integrations" },
      { name: "Professional", billed_monthly: "$99/mo", billed_annual: "", credits: "2,000 export credits/mo", key_features: "Buying intent signals, AI email writing, A/B testing" },
      { name: "Organization", billed_monthly: "Custom (sales call)", billed_annual: "", credits: "Up to 1M credits/year", key_features: "Higher API rate limits, SSO, custom roles, dedicated CSM" },
    ],
    pros: [
      "Largest database — 275M+ contacts, 73M+ companies",
      "All-in-one: prospecting + outreach + analytics in one place",
      "Generous free plan (50 credits/mo)",
      "Built-in AI email writing + A/B testing",
      "Strong CRM integrations (Salesforce, HubSpot, Outreach)",
      "LinkedIn Chrome extension for real-time enrichment",
    ],
    cons: [
      "Free plan blocks all API endpoints — must be on Basic ($49/mo) or higher for API access",
      "Data accuracy inconsistent — mobile numbers especially",
      "Export vs. view credits confusing and limiting",
      "Pricing changes frequently without notice",
      "Poor support on Basic/Professional tiers",
      "Sequences limited on lower plans",
    ],
    best_for: "SMB/mid-market sales teams wanting all-in-one prospecting + outreach at mid-range price",
    data_note: "Apollo's pricing page uses dynamic JS — figures confirmed via public sources. API access available on Basic ($49/mo)+. Free plan returns 403 on all API endpoints.",
  },
  {
    name: "Hunter.io",
    tagline: "Domain-based email finder",
    color: "bg-yellow-500",
    entry_monthly: 49,
    has_phones: false,
    has_sequences: true,
    plans: [
      { name: "Starter", billed_monthly: "$49/mo", billed_annual: "", credits: "2,000 searches/mo", key_features: "3 email accounts, AI writing assistant, advanced filters, inbox protection" },
      { name: "Growth", billed_monthly: "$149/mo", billed_annual: "", credits: "10,000 searches/mo", key_features: "10 email accounts, 5,000 recipients/sequence, lead enrichment" },
      { name: "Scale", billed_monthly: "$299/mo", billed_annual: "", credits: "25,000 searches/mo", key_features: "20 email accounts, 15,000 recipients/sequence, unlimited Signals" },
      { name: "Enterprise", billed_monthly: "Custom", billed_annual: "", credits: "Custom", key_features: "Dedicated manager, custom integrations, SLA" },
    ],
    pros: [
      "Best domain search — finds all emails at a company instantly",
      "Simple, fully transparent public pricing",
      "Unlimited team members on all plans",
      "Built-in email warmup + campaign sending",
      "Strong email verification accuracy",
      "30% annual discount — best-in-class",
    ],
    cons: [
      "Email only — zero phone/mobile number data",
      "No intent data or firmographic enrichment",
      "Smaller contact database than Apollo or ZoomInfo",
      "No LinkedIn integration",
      "Credits not shared/pooled across large teams",
    ],
    best_for: "SDRs and marketers who need verified professional emails by domain — not full contact enrichment",
  },
  {
    name: "Instantly.ai",
    tagline: "Cold email sending at scale",
    color: "bg-blue-500",
    entry_monthly: 47,
    has_phones: false,
    has_sequences: true,
    plans: [
      { name: "Outreach — Growth", billed_monthly: "$47/mo", billed_annual: "", credits: "5,000 emails/mo, 1,000 active contacts", key_features: "Unlimited email accounts + warmup, basic analytics" },
      { name: "Outreach — Hypergrowth", billed_monthly: "$97/mo", billed_annual: "", credits: "100,000 emails/mo, 25,000 active contacts", key_features: "Advanced analytics, premium live support" },
      { name: "Outreach — Light Speed", billed_monthly: "$358/mo", billed_annual: "", credits: "500,000 emails/mo, 100,000 contacts", key_features: "Smart inboxing/sending rotation (SISR)" },
      { name: "Credits — Growth", billed_monthly: "$47/mo", billed_annual: "", credits: "1,500–2,000 lead credits/mo", key_features: "Lead data sourcing — SEPARATE subscription" },
      { name: "Credits — Supersonic", billed_monthly: "$97/mo", billed_annual: "", credits: "5,000–7,500 lead credits/mo", key_features: "Higher volume prospecting data" },
    ],
    pros: [
      "Best-in-class cold email infrastructure and deliverability",
      "Unlimited email accounts + warmup on ALL plans — huge value",
      "Very affordable entry ($47/mo covers sending)",
      "Trusted by thousands of cold email agencies",
      "Clean, easy-to-use UI",
    ],
    cons: [
      "Sending and data are two separate subscriptions — need ~$94/mo minimum for both",
      "No native CRM — limited integrations vs. Apollo",
      "Contact data quality is secondary to their core product",
      "No phone number data",
      "No free tier — trial only",
    ],
    best_for: "Cold email agencies and high-volume outbound teams who need massive send volume at low cost",
  },
  {
    name: "ZoomInfo",
    tagline: "Enterprise B2B data powerhouse",
    color: "bg-indigo-600",
    entry_monthly: 1250,
    has_phones: true,
    has_sequences: true,
    plans: [
      { name: "SalesOS Professional", billed_monthly: "~$1,250/mo (annual only)", billed_annual: "", credits: "1,000–5,000 bulk exports/yr", key_features: "Core contact + company data, basic intent signals" },
      { name: "SalesOS Advanced", billed_monthly: "~$2,000–$3,300/mo (est.)", billed_annual: "", credits: "Higher exports + advanced intent", key_features: "Org charts, technographics, buying intent (Bombora)" },
      { name: "SalesOS Elite", billed_monthly: "Custom (~$40K+/yr)", billed_annual: "", credits: "Negotiated", key_features: "Full suite: API, Chorus.ai, dedicated CSM" },
    ],
    pros: [
      "Most comprehensive database — 260M+ professionals, 100M+ companies",
      "Best-in-class buying intent data (Bombora partnership)",
      "Org charts + technographics for enterprise navigation",
      "Highest US phone/direct-dial accuracy",
      "Conversation intelligence (Chorus.ai) on higher tiers",
    ],
    cons: [
      "Extremely expensive — effectively priced out of SMB market",
      "Annual contracts only — no monthly billing whatsoever",
      "Full pricing requires sales call + negotiation",
      "Steep learning curve and bloated product",
      "Weaker international data coverage",
      "Constant upsell pressure and add-on fees",
    ],
    best_for: "Enterprise sales teams with $15K+/yr budget needing highest-accuracy data + intent signals + full GTM stack",
    data_note: "Pricing fully gated — no public prices. ~$15K/yr is widely reported industry estimate for single-user entry.",
  },
  {
    name: "Lusha",
    tagline: "Direct-dial phone numbers via LinkedIn",
    color: "bg-pink-500",
    entry_monthly: 49.90,
    has_phones: true,
    has_sequences: false,
    plans: [
      { name: "Starter", billed_monthly: "$49.90/mo", billed_annual: "", credits: "400 credits/mo (1 credit = 1 email, 10 credits = 1 phone)", key_features: "Email + phone reveal, CRM sync, prospecting filters" },
      { name: "Professional", billed_monthly: "$69.90/mo", billed_annual: "", credits: "600 credits/mo", key_features: "Enrichment API, advanced filters, bulk actions" },
      { name: "Premium", billed_monthly: "$399.90/mo", billed_annual: "", credits: "3,400 credits/mo", key_features: "Team features, per-user credit controls, priority support" },
      { name: "Scale", billed_monthly: "Custom", billed_annual: "", credits: "Custom", key_features: "SSO, dedicated CSM, custom integrations" },
    ],
    pros: [
      "Best direct-dial phone coverage — top choice for cold calling",
      "Clean, easy LinkedIn Chrome extension",
      "Unused credits roll over (up to 2× plan limit)",
      "Transparent public pricing",
      "Good GDPR/CCPA compliance tooling",
    ],
    cons: [
      "Phone reveals burn 10× more credits than emails",
      "Low credit limits vs. competitors at same price",
      "US/Western Europe skewed — weaker elsewhere",
      "No email sequencing or outreach features",
      "Team plans (5+ users) require sales contact",
    ],
    best_for: "Sales reps who need direct-dial phone numbers for cold calling, especially via LinkedIn",
  },
  {
    name: "Snov.io",
    tagline: "Affordable all-in-one for agencies",
    color: "bg-teal-500",
    entry_monthly: 39,
    has_phones: false,
    has_sequences: true,
    plans: [
      { name: "Starter", billed_monthly: "$39/mo", billed_annual: "", credits: "1,000 credits/mo, 5,000 recipients/mo", key_features: "3 mailbox warmups, unlimited campaigns, basic CRM" },
      { name: "Pro S", billed_monthly: "$99/mo", billed_annual: "", credits: "5,000 credits/mo, 25,000 recipients/mo", key_features: "Unlimited warmups, unlimited AI email, all integrations" },
      { name: "Pro M", billed_monthly: "$189/mo", billed_annual: "", credits: "20,000 credits/mo, 100,000 recipients/mo", key_features: "Higher volume, full analytics, priority support" },
      { name: "Ultra", billed_monthly: "Custom", billed_annual: "", credits: "200K+ credits/mo", key_features: "Credit rollover, dedicated CSM, bulk account management" },
    ],
    pros: [
      "All-in-one: email finder + verifier + drip campaigns + CRM",
      "Unlimited team seats on ALL plans",
      "Generous 25% annual discount",
      "Strong 7-tier email verification accuracy",
      "Most affordable entry with solid feature set",
    ],
    cons: [
      "Credits shared across team — burns fast with multiple users",
      "UI feels cluttered with too many overlapping features",
      "Weaker data coverage outside US/EU",
      "LinkedIn automation costs extra (+$62/mo add-on)",
      "Slower support on lower tiers",
    ],
    best_for: "Small agencies and lean sales teams wanting affordable all-in-one cold outreach without separate subscriptions",
  },
];

type Tab = "overview" | "pricing" | "proscons";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformsPage() {
  const [expandedPhase, setExpandedPhase] = useState<number>(1);
  const [showTools, setShowTools] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const active = selected ? PLATFORMS.find(p => p.name === selected) : null;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Owle Platform — What to Subscribe To</h1>
        <p className="text-sm text-gray-500 mt-1">
          Phased buying guide · start lean, upgrade when volume demands it · all prices monthly billing
        </p>
      </div>

      {/* ── ROI callout ── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl px-6 py-5 flex items-center justify-between gap-6 text-white">
        <div>
          <p className="font-bold text-lg">One SNF contract = $10,000–50,000/year</p>
          <p className="text-blue-200 text-sm mt-0.5">Phase 1 stack costs $66–76/mo = $792/year. A single deal pays for <strong className="text-white">10–60 years</strong> of the stack.</p>
        </div>
        <div className="shrink-0 text-center bg-white/10 rounded-xl px-5 py-3">
          <p className="text-blue-200 text-xs mb-0.5">Start today</p>
          <p className="font-bold text-xl">$66–76<span className="text-sm font-normal text-blue-300">/mo</span></p>
          <p className="text-blue-300 text-xs mt-0.5">Phase 1 total</p>
        </div>
      </div>

      {/* ── Phase cards ── */}
      <div className="flex flex-col gap-3">
        {PHASES.map(phase => {
          const isOpen = expandedPhase === phase.id;
          const hasBuyNow = phase.items.some(i => i.status === "buy-now" || i.status === "required");
          return (
            <div key={phase.id} className="bg-white border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPhase(isOpen ? 0 : phase.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`${PHASE_HEADER[phase.color]} text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0`}>
                    {phase.id}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{phase.label}</p>
                    <p className="text-xs text-gray-400">{phase.sublabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {hasBuyNow && !isOpen && (
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                      action needed
                    </span>
                  )}
                  <span className="font-bold text-gray-900 text-sm">{phase.total}</span>
                  <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Service</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400">Plan</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">Cost</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Why</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase.items.map((item, i) => (
                        <tr key={i} className="border-b last:border-0 align-top">
                          <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap">{item.service}</td>
                          <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{item.plan}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{item.cost}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                            {item.why}
                            {"note" in item && item.note && (
                              <p className="mt-1 text-amber-600">{item.note as string}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[item.status]}`}>
                              {STATUS_LABEL[item.status]}
                            </span>
                            {"link" in item && item.link && (
                              <a href={item.link as string} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 hover:underline mt-1">
                                pricing →
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <p className="text-xs text-gray-400">Total for {phase.label}</p>
                    <p className="font-bold text-gray-900">{phase.total}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Current stack status ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Current Stack Status</h2>
          <p className="text-xs text-gray-500 mt-0.5">What's active, what needs upgrading right now</p>
        </div>
        <div className="divide-y">
          {[
            { service: "Render", status: "⚠ Upgrade needed", detail: "Free tier spins down. Pay $7/mo for Starter to keep always-on.", color: "text-amber-500" },
            { service: "Hunter.io", status: "⚠ Not subscribed", detail: "No active subscription. Subscribe to Outreach Platform Starter ($49/mo) to unlock API + 2,000 searches/mo.", color: "text-red-500" },
            { service: "Apollo.io", status: "⚠ Free plan (403 errors)", detail: "API calls return 403. Upgrade to Basic (~$49–59/mo) to fix contact enrichment.", color: "text-red-500" },
            { service: "Apify", status: "⚠ Free tier depleted", detail: "$5 free credit runs out after ~25 lookups. Upgrade to Starter ($29/mo) for consistent fallback.", color: "text-amber-500" },
            { service: "Anthropic", status: "✓ Active", detail: "Pay-as-you-go. New API key active.", color: "text-green-600" },
            { service: "Supabase", status: "✓ Free tier active", detail: "DB within free limits. Upgrade to Pro ($25/mo) when hitting 500 MB.", color: "text-green-600" },
            { service: "Vercel", status: "✓ Hobby (free)", detail: "Frontend deployed. No upgrade needed until team grows.", color: "text-green-600" },
            { service: "Gmail API", status: "✓ Active", detail: "OAuth connected. Token needs periodic refresh.", color: "text-green-600" },
            { service: "Google Calendar API", status: "✓ Active", detail: "Meeting creation works. Token auto-refreshes.", color: "text-green-600" },
            { service: "AgentMail", status: "✓ Free tier active", detail: "Reply inbox working. Upgrade to Developer ($20/mo) when daily cap hit.", color: "text-green-600" },
            { service: "Tavily", status: "✓ Free tier active", detail: "1,000 searches/mo free — sufficient for current volume.", color: "text-green-600" },
          ].map(row => (
            <div key={row.service} className="px-5 py-3 flex items-start gap-4">
              <p className="font-medium text-gray-900 text-sm w-40 shrink-0">{row.service}</p>
              <p className={`text-xs font-semibold w-44 shrink-0 ${row.color}`}>{row.status}</p>
              <p className="text-xs text-gray-500">{row.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── What Owle automates ── */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-1">What the Platform Does End-to-End</h2>
        <p className="text-xs text-gray-500 mb-4">Every step automated — you only review before sending</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {[
            ["Search SNFs", "15,000+ CMS-verified facilities — filter by state, city, turnover, star rating"],
            ["ICP Scoring", "0–100 fit score + priority score per facility based on pain signals"],
            ["Contact Enrichment", "Hunter → Apollo → Apify in order, deduplicated by email"],
            ["Email Drafting", "Personalized cold email using facility-specific CMS data"],
            ["Approval Queue", "Review + approve before anything is sent — you stay in control"],
            ["Gmail Sending", "Approved emails sent via Gmail API automatically"],
            ["Reply Classification", "Interested / not now / referral / unsubscribe — auto-classified"],
            ["Response Drafting", "AI drafts reply based on classification + conversation context"],
            ["Meeting Booking", "Google Calendar event + Meet link created on one click"],
            ["Pipeline Tracking", "New → Contacted → Meeting → Won/Lost across all accounts"],
            ["Audit Log", "Every agent action logged and traceable per account"],
            ["Learning Updater", "Strategy refined after each run based on what worked"],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2 text-sm">
              <span className="text-blue-500 shrink-0 mt-0.5">✓</span>
              <span><strong className="text-gray-800">{title}</strong> <span className="text-gray-500 text-xs">— {desc}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tool reference ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTools(!showTools)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-left transition-colors"
        >
          <div>
            <p className="font-semibold text-gray-900 text-sm">Tool Reference — Pricing & API Details</p>
            <p className="text-xs text-gray-400 mt-0.5">Per-tool pricing breakdown, API tiers, and caveats</p>
          </div>
          <span className="text-gray-400 text-sm">{showTools ? "Hide ▲" : "Show ▼"}</span>
        </button>
        {showTools && (
          <div className="border-t overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Tool</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Role in Owle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Plan</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">API Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Credits</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 max-w-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map(t => (
                  <tr key={t.name} className="border-b last:border-0 align-top hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{t.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.role}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.owle_plan}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{t.owle_cost}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.api_tier}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.credits}</td>
                    <td className="px-4 py-3 text-xs text-amber-600 max-w-xs">{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PLATFORM COMPARISON — reference material
      ════════════════════════════════════════════════════════════════════════ */}

      <div className="border-t pt-6">
        <h2 className="text-lg font-bold text-gray-900">Platform Comparison — Market Reference</h2>
        <p className="text-sm text-gray-500 mt-1">How individual tools compare · context for choosing data sources</p>
      </div>

      {/* ── The 2 Things You Must Have ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">The 2 Things You Must Have Per Contact</h2>
          <p className="text-xs text-gray-500 mt-0.5">Everything else is optional — these two are required for outreach to work</p>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="px-5 py-5 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-bold text-gray-900">Email Address</p>
                <p className="text-xs text-gray-500">To send cold outreach · Owle drafts + sends automatically</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { tool: "Hunter.io Starter", gives: "Up to 2,000 emails/mo via domain search", quality: "High — verified", color: "text-green-700 bg-green-50", badge: "best" },
                { tool: "Apollo Basic", gives: "Up to 1,000 emails/mo from 275M database", quality: "High — verified", color: "text-green-700 bg-green-50", badge: "good" },
                { tool: "Apify Starter", gives: "Scraped emails from company domain", quality: "Medium — unverified", color: "text-yellow-700 bg-yellow-50", badge: "fallback" },
                { tool: "Snov.io Starter", gives: "Up to 1,000 emails/mo", quality: "High — verified", color: "text-green-700 bg-green-50", badge: "" },
              ].map(r => (
                <div key={r.tool} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.tool}</p>
                    <p className="text-xs text-gray-500">{r.gives}</p>
                    <p className={`text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded inline-block ${r.color}`}>{r.quality}</p>
                  </div>
                  {r.badge && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{r.badge}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-5 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-bold text-gray-900">LinkedIn Profile URL</p>
                <p className="text-xs text-gray-500">To send LinkedIn message · Copy message + open profile in one click</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { tool: "Hunter.io Starter", gives: "Returns LinkedIn URL when found via domain search", quality: "Included — when available", color: "text-green-700 bg-green-50", badge: "best" },
                { tool: "Apollo Basic", gives: "LinkedIn URL for most contacts in database", quality: "High coverage — 275M profiles", color: "text-green-700 bg-green-50", badge: "good" },
                { tool: "Apify Starter", gives: "Email only — no LinkedIn URL returned", quality: "Not available", color: "text-red-600 bg-red-50", badge: "email only" },
                { tool: "Snov.io Starter", gives: "Limited LinkedIn data on lower plans", quality: "Partial", color: "text-yellow-700 bg-yellow-50", badge: "" },
              ].map(r => (
                <div key={r.tool} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.tool}</p>
                    <p className="text-xs text-gray-500">{r.gives}</p>
                    <p className={`text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded inline-block ${r.color}`}>{r.quality}</p>
                  </div>
                  {r.badge && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{r.badge}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
          <span className="text-amber-500 text-lg shrink-0">→</span>
          <p className="text-sm text-amber-800"><strong>Hunter + Apollo together</strong> gives the best email + LinkedIn coverage. Hunter finds emails by domain (high accuracy), Apollo adds LinkedIn URLs and fills gaps from its 275M contact database. Together they cover ~90% of SNF decision-makers.</p>
        </div>
      </div>

      {/* ── Individual APIs vs One Platform ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Individual APIs vs. One Platform — Which Makes Sense?</h2>
          <p className="text-xs text-gray-500 mt-0.5">The core question for any outbound stack</p>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-blue-700 mb-3">✦ Use Individual APIs (like Owle does)</p>
            <ul className="flex flex-col gap-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span><span><strong>Pay only for what you use.</strong> Hunter Starter at $49/mo = 2,000 searches. Apify pay-per-use = near-zero cost for small batches. You only pay when you scale.</span></li>
              <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span><span><strong>Best-of-breed data per source.</strong> Apollo has the largest database, Hunter has the best domain search, Lusha has the best phone data. One platform can't win every category.</span></li>
              <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span><span><strong>No vendor lock-in.</strong> Swap out a source any time without migrating your workflow. Apollo raises prices? Switch to Snov.io in one config change.</span></li>
              <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span><span><strong>Programmatic control.</strong> APIs let you enrich automatically on import, trigger enrichment based on signals (high turnover + low star rating), and build custom logic no UI can do.</span></li>
              <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span><span><strong>Deduplication across sources.</strong> Owle tries Apollo → Hunter → Apify in order, deduplicates by email. You get broader coverage without paying 3× for overlapping data.</span></li>
            </ul>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">⊘ Use One Platform Directly</p>
            <ul className="flex flex-col gap-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-gray-400 shrink-0">→</span><span><strong>Simpler to start.</strong> No code, no integration work. Log in, search, export. Good for a solo rep who isn't building a workflow.</span></li>
              <li className="flex gap-2"><span className="text-gray-400 shrink-0">→</span><span><strong>One bill, one login.</strong> Easier to manage if your team doesn't have engineering resources.</span></li>
              <li className="flex gap-2"><span className="text-gray-400 shrink-0">→</span><span><strong>Built-in outreach.</strong> Apollo and Snov.io bundle email sequencing — useful if you don't have a separate sending tool.</span></li>
              <li className="flex gap-2"><span className="text-gray-400 shrink-0">→</span><span><strong>When data volume is high.</strong> Apollo Professional at $99/mo gives 2,000 exports — cheaper per contact than paying Apify per-run at scale.</span></li>
            </ul>
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700"><strong>Bottom line:</strong> If you're sending &lt;500 outreach/mo and have a technical workflow (like Owle), individual free/cheap APIs win on cost. Above 2,000 contacts/mo, Apollo Professional or Snov.io Pro S starts making sense as a primary source.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cost per 1k emails ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Cost to Get 1,000 Verified Business Emails</h2>
          <p className="text-xs text-gray-500 mt-0.5">Starter/basic paid plan · monthly billing · one plan per platform</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Source</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Plan</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Monthly Cost</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Credits / Month</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Cost / 1k contacts</th>
            </tr>
          </thead>
          <tbody>
            {[
              { src: "Hunter.io", plan: "Starter", monthly: "$49/mo", credits: "2,000", per1k: "~$24.50" },
              { src: "Apollo.io", plan: "Basic", monthly: "$49/mo", credits: "1,000", per1k: "~$49" },
              { src: "Snov.io", plan: "Starter", monthly: "$39/mo", credits: "1,000", per1k: "~$39" },
              { src: "Instantly.ai", plan: "Credits — Growth", monthly: "$47/mo", credits: "~1,750", per1k: "~$26.85" },
              { src: "Lusha", plan: "Starter", monthly: "$49.90/mo", credits: "400", per1k: "~$124.75" },
              { src: "ZoomInfo", plan: "Professional (est.)", monthly: "~$1,250/mo", credits: "~417", per1k: "~$3,000" },
            ].map(row => (
              <tr key={row.src} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{row.src}</td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{row.plan}</td>
                <td className="px-4 py-2.5 text-right text-gray-800 text-xs font-medium">{row.monthly}</td>
                <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{row.credits}</td>
                <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">{row.per1k}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Volume comparison ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Cost by Volume — Owle vs. Platforms Directly</h2>
          <p className="text-xs text-gray-500 mt-0.5">Monthly cost + cost per lead · monthly billing · starter paid plans</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs w-24">Leads/mo</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-blue-700 bg-blue-50 border-x border-blue-100">Owle<br/><span className="font-normal text-blue-400">full automation</span></th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Apollo Basic<br/><span className="font-normal text-gray-400">data only</span></th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Hunter Starter<br/><span className="font-normal text-gray-400">data only</span></th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Snov.io Starter<br/><span className="font-normal text-gray-400">data + basic seq.</span></th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Apollo Pro + Instantly<br/><span className="font-normal text-gray-400">data + manual send</span></th>
              </tr>
            </thead>
            <tbody>
              {[
                { v: 10,   owle: 86,  apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 100,  owle: 90,  apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 200,  owle: 95,  apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 500,  owle: 110, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 700,  owle: 120, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 1000, owle: 135, apollo: 49,  hunter: 49, snovio: 39, diy: 146, limitNote: true },
              ].map(row => (
                <tr key={row.v} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-800">{row.v.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center bg-blue-50 border-x border-blue-100">
                    <p className="font-bold text-blue-700">${row.owle}/mo</p>
                    <p className="text-xs text-blue-400 mt-0.5">${(row.owle / row.v).toFixed(2)}/lead</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="font-medium text-gray-700">${row.apollo}/mo{row.limitNote ? <span className="text-amber-500">*</span> : ""}</p>
                    <p className="text-xs text-gray-400 mt-0.5">${(row.apollo / row.v).toFixed(2)}/lead</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="font-medium text-gray-700">${row.hunter}/mo</p>
                    <p className="text-xs text-gray-400 mt-0.5">${(row.hunter / row.v).toFixed(2)}/lead</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="font-medium text-gray-700">${row.snovio}/mo{row.limitNote ? <span className="text-amber-500">*</span> : ""}</p>
                    <p className="text-xs text-gray-400 mt-0.5">${(row.snovio / row.v).toFixed(2)}/lead</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="font-medium text-gray-700">${row.diy}/mo</p>
                    <p className="text-xs text-gray-400 mt-0.5">${(row.diy / row.v).toFixed(2)}/lead</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-5 py-4 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What's included at each price</p>
          <div className="grid grid-cols-5 gap-2 text-xs">
            {[
              {
                label: "Owle",
                color: "text-blue-700 bg-blue-50 border-blue-200",
                items: ["Contact data (Hunter + Apify)", "ICP / priority scoring (AI)", "Personalized email drafts (AI)", "Outreach queue + sending", "Reply classification (AI)", "Meeting booking (auto)"],
                missing: [],
              },
              {
                label: "Apollo Basic",
                color: "text-gray-700 bg-white border-gray-200",
                items: ["Contact data (1,000/mo)"],
                missing: ["ICP scoring — manual", "Email writing — manual", "Outreach setup — manual", "Reply handling — manual", "Meeting booking — manual"],
              },
              {
                label: "Hunter Starter",
                color: "text-gray-700 bg-white border-gray-200",
                items: ["Contact data by domain (2,000/mo)", "Basic email sequences"],
                missing: ["ICP scoring — manual", "Email personalization — manual", "Reply handling — manual", "Meeting booking — manual"],
              },
              {
                label: "Snov.io Starter",
                color: "text-gray-700 bg-white border-gray-200",
                items: ["Contact data (1,000/mo)", "Drip campaigns (basic)"],
                missing: ["ICP scoring — manual", "Email personalization — manual", "Reply handling — manual", "Meeting booking — manual"],
              },
              {
                label: "Apollo Pro + Instantly",
                color: "text-gray-700 bg-white border-gray-200",
                items: ["Contact data (2,000/mo)", "Email sending at scale"],
                missing: ["ICP scoring — manual", "Email writing — manual", "Reply handling — manual", "Meeting booking — manual"],
              },
            ].map(col => (
              <div key={col.label} className={`border rounded-lg p-3 ${col.color}`}>
                <p className="font-semibold text-xs mb-2">{col.label}</p>
                {col.items.map(i => (
                  <div key={i} className="flex gap-1.5 mb-1">
                    <span className="text-green-500 shrink-0">✓</span>
                    <span className="text-gray-600">{i}</span>
                  </div>
                ))}
                {col.missing.map(i => (
                  <div key={i} className="flex gap-1.5 mb-1">
                    <span className="text-red-300 shrink-0">✗</span>
                    <span className="text-gray-400">{i}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3">* At 1,000 leads/mo — Apollo Basic and Snov.io Starter hit their credit cap. Upgrade to Professional ($99) and Pro S ($99) respectively.</p>
          <p className="text-xs text-gray-400 mt-1">Owle variable cost: ~$0.05/lead (Anthropic Claude for scoring + email drafting). Fixed: Render $7 + Hunter $49 + Apify $29 = $85 base.</p>
        </div>
      </div>

      {/* ── All Plans Monthly Price ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">All Plans — Monthly Price</h2>
          <p className="text-xs text-gray-500 mt-0.5">Click a platform for full plan details, pros/cons</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Platform</th>
              <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs">📞 Phones</th>
              <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs">📧 Sequences</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Entry price (monthly)</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {PLATFORMS.map((p, i) => (
              <tr key={p.name} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.color}`} />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.tagline}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-sm">{p.has_phones ? <span className="text-green-600 font-medium">✓</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-3 text-center text-sm">{p.has_sequences ? <span className="text-green-600 font-medium">✓</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 text-sm">${p.entry_monthly}/mo</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => { setSelected(p.name === selected ? null : p.name); setTab("overview"); }}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    {selected === p.name ? "Close ↑" : "Details →"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail panel ── */}
      {active && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b bg-gray-50">
            <span className={`w-2.5 h-2.5 rounded-full ${active.color}`} />
            <h2 className="font-semibold text-gray-900">{active.name}</h2>
            <span className="text-sm text-gray-400">{active.tagline}</span>
            <div className="ml-auto flex gap-1">
              {(["overview", "pricing", "proscons"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                  {t === "proscons" ? "Pros & Cons" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {tab === "overview" && (
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Phone Numbers</p>
                  <p className={`font-semibold text-sm ${active.has_phones ? "text-green-700" : "text-gray-400"}`}>{active.has_phones ? "Yes" : "No"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Email Sequences</p>
                  <p className={`font-semibold text-sm ${active.has_sequences ? "text-green-700" : "text-gray-400"}`}>{active.has_sequences ? "Yes" : "No"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Entry Price (monthly billing)</p>
                  <p className="font-bold text-gray-900 text-sm">${active.entry_monthly}/mo</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Best For</p>
                <p className="text-sm text-gray-700">{active.best_for}</p>
              </div>
              {active.data_note && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">⚠ {active.data_note}</p>
              )}
            </div>
          )}

          {tab === "pricing" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Plan</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Monthly price</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Credits / Volume</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  {active.plans.map(plan => (
                    <tr key={plan.name} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 text-sm">{plan.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700 text-sm">{plan.billed_monthly}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{plan.credits}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{plan.key_features}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "proscons" && (
            <div className="px-5 py-4 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Pros</p>
                <ul className="flex flex-col gap-2">
                  {active.pros.map(p => (
                    <li key={p} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">Cons</p>
                <ul className="flex flex-col gap-2">
                  {active.cons.map(c => (
                    <li key={c} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-red-400 shrink-0 mt-0.5">✗</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Owle stack subscriptions ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Owle Agent — What to Subscribe To</h2>
          <p className="text-xs text-gray-500 mt-0.5">Monthly billing · starter plans only · what you actually need to run Owle</p>
        </div>

        {/* Infrastructure */}
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Infrastructure (Required)</p>
          <table className="w-full text-sm">
            <tbody>
              {[
                { service: "Render", plan: "Starter Web Service", cost: "$7/mo", what: "Backend (FastAPI). Free tier spins down after inactivity — pay $7/mo to stay always-on.", status: "required", color: "text-red-600" },
                { service: "Supabase", plan: "Free tier", cost: "$0/mo", what: "Postgres DB, real-time subscriptions, auth. Free covers 500 MB + 50k MAU — enough for early stage.", status: "free now", color: "text-green-600" },
                { service: "Supabase", plan: "Pro (when scaling)", cost: "$25/mo", what: "Needed when DB hits 500 MB or traffic grows. Unlocks 8 GB storage, daily backups, no pausing.", status: "later", color: "text-gray-400" },
                { service: "Vercel", plan: "Hobby (free)", cost: "$0/mo", what: "Frontend hosting. Free handles custom domains + unlimited deploys. Upgrade to Pro ($20/mo) only when team grows.", status: "free now", color: "text-green-600" },
              ].map(r => (
                <tr key={r.service + r.plan} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-gray-800 w-28">{r.service}</td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs w-40">{r.plan}</td>
                  <td className="py-2.5 pr-4 font-bold text-gray-900 w-20">{r.cost}</td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.what}</td>
                  <td className={`py-2.5 text-xs font-medium whitespace-nowrap ${r.color}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI */}
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI (Required — Pay Per Use)</p>
          <table className="w-full text-sm">
            <tbody>
              {[
                { service: "Anthropic API", plan: "Claude Sonnet 4.6", cost: "~$20–60/mo", what: "Used for: ICP scoring, email drafting, reply classification, stakeholder mapping, meeting notes. $3/M input tokens, $15/M output. 100 accounts/mo ≈ ~$5–15; 500 accounts ≈ ~$25–60.", status: "pay-as-you-go", color: "text-blue-600" },
              ].map(r => (
                <tr key={r.service} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-gray-800 w-28">{r.service}</td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs w-40">{r.plan}</td>
                  <td className="py-2.5 pr-4 font-bold text-gray-900 w-20">{r.cost}</td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.what}</td>
                  <td className={`py-2.5 text-xs font-medium whitespace-nowrap ${r.color}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Email & Calendar */}
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Email & Calendar (Free APIs)</p>
          <table className="w-full text-sm">
            <tbody>
              {[
                { service: "Gmail API", plan: "Google Workspace or personal", cost: "$0/mo", what: "Reading emails, sending outreach. Free within Google's quotas (daily send limit applies).", status: "free", color: "text-green-600" },
                { service: "Google Calendar API", plan: "OAuth2 access", cost: "$0/mo", what: "Creating meeting events + Google Meet links. Free within quota.", status: "free", color: "text-green-600" },
                { service: "AgentMail", plan: "Free tier", cost: "$0/mo", what: "Managed inboxes for receiving replies. Free gives 3 inboxes, 3,000 emails/mo. Developer plan ($20/mo) removes daily cap for higher volume.", status: "free now", color: "text-green-600" },
              ].map(r => (
                <tr key={r.service} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-gray-800 w-28">{r.service}</td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs w-40">{r.plan}</td>
                  <td className="py-2.5 pr-4 font-bold text-gray-900 w-20">{r.cost}</td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.what}</td>
                  <td className={`py-2.5 text-xs font-medium whitespace-nowrap ${r.color}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Data / Enrichment */}
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact Enrichment (Optional Upgrades)</p>
          <table className="w-full text-sm">
            <tbody>
              {[
                { service: "Hunter.io", plan: "Starter", cost: "$49/mo", what: "2,000 domain searches/mo. Most reliable source — finds all emails at a company by domain. Primary enrichment source in Owle.", status: "recommended", color: "text-blue-600" },
                { service: "Apify", plan: "Starter", cost: "$29/mo", what: "$29/mo + pay-as-you-go at $0.20/CU. Easy-email-finder actor ~0.5–1 CU per domain. Free $5 credit (~25–50 lookups) runs out fast — Starter gives prepaid credits for real volume. Use as fallback when Hunter finds nothing.", status: "upgrade needed", color: "text-amber-500" },
                { service: "Apollo.io", plan: "Basic", cost: "$49/mo", what: "1,000 export credits/mo with API access. Owle currently gets 403 because you're on the free plan — upgrading to Basic unlocks the People Search API and fixes enrichment.", status: "upgrade to fix", color: "text-amber-500" },
                { service: "Tavily", plan: "Researcher", cost: "$0/mo", what: "1,000 search credits/mo. Used by web_enricher to find company websites + context. Free covers moderate use.", status: "active (free)", color: "text-green-600" },
              ].map(r => (
                <tr key={r.service + r.plan} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-gray-800 w-28">{r.service}</td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs w-40">{r.plan}</td>
                  <td className="py-2.5 pr-4 font-bold text-gray-900 w-20">{r.cost}</td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.what}</td>
                  <td className={`py-2.5 text-xs font-medium whitespace-nowrap ${r.color}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-5 py-4 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Monthly Total</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Minimum (infrastructure only)</p>
              <p className="text-2xl font-bold text-gray-900">$7<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Render only. AI usage + enrichment extra.</p>
            </div>
            <div className="bg-white border-2 border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">★ Starter stack (recommended)</p>
              <p className="text-2xl font-bold text-blue-700">$134–174<span className="text-sm font-normal text-blue-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Render $7 + Hunter $49 + Apify $29 + Anthropic ~$20–60 + Tavily $0.</p>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Growth stack (scaling)</p>
              <p className="text-2xl font-bold text-gray-900">$224–294<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Above + Supabase Pro $25 + AgentMail Dev $20 + higher AI usage.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Value / ROI ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Value You're Getting — What Owle Replaces</h2>
          <p className="text-xs text-gray-500 mt-0.5">At $134–174/mo, what would this cost if done manually or with traditional tools?</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Apollo Pro + Instantly Growth (do-it-yourself stack)", cost: "$147/mo", note: "Apollo Professional $99/mo + Instantly Growth $47/mo — but no AI scoring, no auto-outreach, no reply handling.", color: "bg-yellow-50 border-yellow-100" },
              { label: "Owle Agent starter stack", cost: "$134–174/mo", note: "Everything automated: CMS search → ICP scoring → personalized email drafts → reply classification → meeting booking.", color: "bg-blue-50 border-blue-200" },
            ].map(item => (
              <div key={item.label} className={`border rounded-lg p-4 ${item.color}`}>
                <p className="text-xs font-medium text-gray-600 mb-1">{item.label}</p>
                <p className="text-xl font-bold text-gray-900 mb-2">{item.cost}</p>
                <p className="text-xs text-gray-500">{item.note}</p>
              </div>
            ))}
          </div>

          <div className="border rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">What Owle automates end-to-end</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {[
                "Search 15,000+ CMS-verified SNFs by state, city, turnover, star rating",
                "ICP scoring (0–100) and priority scoring per facility",
                "Personalized cold email drafts using facility-specific pain signals",
                "Outreach approval queue — review before sending",
                "Inbound reply classification (interested / not a fit / needs info)",
                "Auto-draft responses to replies using context",
                "Meeting booking with Google Calendar + Meet link injection",
                "Contact enrichment via Hunter.io, Apollo, Apify",
                "Audit log per account — every action traceable",
                "Deal pipeline tracking (new → contacted → meeting → won/lost)",
              ].map(item => (
                <div key={item} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 shrink-0 mt-0.5">✓</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">Pricing sourced from official pages · April 2026 · Subject to change · All prices in USD · Monthly billing</p>
    </div>
  );
}
