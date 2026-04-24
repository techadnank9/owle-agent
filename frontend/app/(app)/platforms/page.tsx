"use client";
import { useState } from "react";

type Plan = {
  name: string;
  billed_monthly: string;   // price if paying month-to-month
  billed_annual: string;    // price per month when paying annually
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
  has_free: boolean;
  entry_monthly: number;   // lowest paid plan, monthly billing
  entry_annual: number;    // lowest paid plan, annual billing (per month)
};

const PLATFORMS: Platform[] = [
  {
    name: "Apollo.io",
    tagline: "All-in-one prospecting + outreach",
    color: "bg-orange-500",
    entry_monthly: 49,
    entry_annual: 39,
    has_phones: true,
    has_sequences: true,
    has_free: true,
    plans: [
      { name: "Free", billed_monthly: "$0/mo", billed_annual: "$0/mo", credits: "50 export credits/mo, 5 mobile credits", key_features: "Basic filters, no API access, Gmail/Outlook only" },
      { name: "Basic", billed_monthly: "$49/mo", billed_annual: "$39/mo", credits: "1,000 export credits/mo", key_features: "Email sequences, Salesforce/HubSpot integrations" },
      { name: "Professional", billed_monthly: "$99/mo", billed_annual: "$79/mo", credits: "2,000 export credits/mo", key_features: "Buying intent signals, AI email writing, A/B testing" },
      { name: "Organization", billed_monthly: "Custom", billed_annual: "Custom", credits: "Up to 1M credits/year", key_features: "API access, SSO, custom roles, dedicated CSM" },
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
      "API access locked to highest (Custom/Org) tier only",
      "Data accuracy inconsistent — mobile numbers especially",
      "Export vs. view credits confusing and limiting",
      "Pricing changes frequently without notice",
      "Poor support on Basic/Professional tiers",
      "Sequences limited on lower plans",
    ],
    best_for: "SMB/mid-market sales teams wanting all-in-one prospecting + outreach at mid-range price",
    data_note: "Apollo's pricing page uses dynamic JS — figures confirmed via public sources. API access requires Organization (Custom) plan.",
  },
  {
    name: "Hunter.io",
    tagline: "Domain-based email finder",
    color: "bg-yellow-500",
    entry_monthly: 49,
    entry_annual: 34,
    has_phones: false,
    has_sequences: true,
    has_free: true,
    plans: [
      { name: "Free", billed_monthly: "$0/mo", billed_annual: "$0/mo", credits: "50 searches/mo, 50 verifications/mo", key_features: "1 email account, 500 recipients/sequence" },
      { name: "Starter", billed_monthly: "$49/mo", billed_annual: "$34/mo", credits: "2,000 searches/mo", key_features: "3 email accounts, AI writing assistant, advanced filters, inbox protection" },
      { name: "Growth", billed_monthly: "$149/mo", billed_annual: "$104/mo", credits: "10,000 searches/mo", key_features: "10 email accounts, 5,000 recipients/sequence, lead enrichment" },
      { name: "Scale", billed_monthly: "$299/mo", billed_annual: "$209/mo", credits: "25,000 searches/mo", key_features: "20 email accounts, 15,000 recipients/sequence, unlimited Signals" },
      { name: "Enterprise", billed_monthly: "Custom", billed_annual: "Custom", credits: "Custom", key_features: "Dedicated manager, custom integrations, SLA" },
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
    entry_annual: 37.60,
    has_phones: false,
    has_sequences: true,
    has_free: false,
    plans: [
      { name: "Outreach — Growth", billed_monthly: "$47/mo", billed_annual: "$37.60/mo", credits: "5,000 emails/mo, 1,000 active contacts", key_features: "Unlimited email accounts + warmup, basic analytics" },
      { name: "Outreach — Hypergrowth", billed_monthly: "$97/mo", billed_annual: "$77.60/mo", credits: "100,000 emails/mo, 25,000 active contacts", key_features: "Advanced analytics, premium live support" },
      { name: "Outreach — Light Speed", billed_monthly: "$358/mo", billed_annual: "$286.30/mo", credits: "500,000 emails/mo, 100,000 contacts", key_features: "Smart inboxing/sending rotation (SISR)" },
      { name: "Credits — Growth", billed_monthly: "$47/mo", billed_annual: "$47/mo", credits: "1,500–2,000 lead credits/mo", key_features: "Lead data sourcing — SEPARATE subscription" },
      { name: "Credits — Supersonic", billed_monthly: "$97/mo", billed_annual: "$97/mo", credits: "5,000–7,500 lead credits/mo", key_features: "Higher volume prospecting data" },
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
    entry_annual: 1250,
    has_phones: true,
    has_sequences: true,
    has_free: false,
    plans: [
      { name: "SalesOS Professional", billed_monthly: "Annual only", billed_annual: "~$1,250/mo (~$15,000/yr)", credits: "1,000–5,000 bulk exports/yr", key_features: "Core contact + company data, basic intent signals" },
      { name: "SalesOS Advanced", billed_monthly: "Annual only", billed_annual: "~$2,000–$3,300/mo (est.)", credits: "Higher exports + advanced intent", key_features: "Org charts, technographics, buying intent (Bombora)" },
      { name: "SalesOS Elite", billed_monthly: "Annual only", billed_annual: "Custom (~$40K+/yr)", credits: "Negotiated", key_features: "Full suite: API, Chorus.ai, dedicated CSM" },
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
    entry_annual: 37.45,
    has_phones: true,
    has_sequences: false,
    has_free: true,
    plans: [
      { name: "Free", billed_monthly: "$0/mo", billed_annual: "$0/mo", credits: "40 credits/mo (1 credit = 1 email, 10 credits = 1 phone)", key_features: "Chrome extension, basic filters, CRM sync" },
      { name: "Starter", billed_monthly: "$49.90/mo", billed_annual: "$37.45/mo", credits: "400 credits/mo", key_features: "Email + phone reveal, CRM sync, prospecting filters" },
      { name: "Professional", billed_monthly: "$69.90/mo", billed_annual: "$52.45/mo", credits: "600 credits/mo", key_features: "Enrichment API, advanced filters, bulk actions" },
      { name: "Premium", billed_monthly: "$399.90/mo", billed_annual: "$299.95/mo", credits: "3,400 credits/mo", key_features: "Team features, per-user credit controls, priority support" },
      { name: "Scale", billed_monthly: "Custom", billed_annual: "Custom", credits: "Custom", key_features: "SSO, dedicated CSM, custom integrations" },
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
    entry_annual: 29.25,
    has_phones: false,
    has_sequences: true,
    has_free: true,
    plans: [
      { name: "Trial", billed_monthly: "$0/mo", billed_annual: "$0/mo", credits: "50 credits, 100 recipients", key_features: "No bulk search, no API, no integrations" },
      { name: "Starter", billed_monthly: "$39/mo", billed_annual: "$29.25/mo", credits: "1,000 credits/mo, 5,000 recipients/mo", key_features: "3 mailbox warmups, unlimited campaigns, basic CRM" },
      { name: "Pro S", billed_monthly: "$99/mo", billed_annual: "$74.25/mo", credits: "5,000 credits/mo, 25,000 recipients/mo", key_features: "Unlimited warmups, unlimited AI email, all integrations" },
      { name: "Pro M", billed_monthly: "$189/mo", billed_annual: "$141.75/mo", credits: "20,000 credits/mo, 100,000 recipients/mo", key_features: "Higher volume, full analytics, priority support" },
      { name: "Ultra", billed_monthly: "Custom", billed_annual: "Custom", credits: "200K+ credits/mo", key_features: "Credit rollover, dedicated CSM, bulk account management" },
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

const COLORS: Record<string, string> = {
  "Apollo.io": "border-orange-200 bg-orange-50 text-orange-700",
  "Hunter.io": "border-yellow-200 bg-yellow-50 text-yellow-700",
  "Instantly.ai": "border-blue-200 bg-blue-50 text-blue-700",
  "ZoomInfo": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Lusha": "border-pink-200 bg-pink-50 text-pink-700",
  "Snov.io": "border-teal-200 bg-teal-50 text-teal-700",
};

type Tab = "overview" | "pricing" | "proscons";

export default function PlatformsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const active = selected ? PLATFORMS.find(p => p.name === selected) : null;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">Real pricing from official sources · April 2026 · All prices shown per month</p>
      </div>

      {/* Why individual APIs vs one platform */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Individual APIs vs. One Platform — Which Makes Sense?</h2>
          <p className="text-xs text-gray-500 mt-0.5">The core question for any outbound stack</p>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-blue-700 mb-3">✦ Use Individual APIs (like Owle does)</p>
            <ul className="flex flex-col gap-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span><span><strong>Pay only for what you use.</strong> Hunter free = 25 searches/mo at $0. Apify free = $5 credits included. You only pay when you scale.</span></li>
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

      {/* Cost at scale table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Cost to Get 1,000 Verified Business Emails</h2>
          <p className="text-xs text-gray-500 mt-0.5">Approximate effective cost per 1,000 contacts across platforms</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Source</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Plan Needed</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Monthly Cost</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Credits Included</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Cost / 1k contacts</th>
            </tr>
          </thead>
          <tbody>
            {[
              { src: "Hunter.io (Owle — active)", plan: "Free", monthly: "$0", credits: "50/mo", per1k: "—  (free, 50 limit)", highlight: true },
              { src: "Hunter.io", plan: "Starter (annual)", monthly: "$34/mo", credits: "2,000/mo", per1k: "~$17", highlight: false },
              { src: "Hunter.io", plan: "Growth (annual)", monthly: "$104/mo", credits: "10,000/mo", per1k: "~$10.40", highlight: false },
              { src: "Apollo.io", plan: "Basic (annual)", monthly: "$39/mo", credits: "1,000/mo", per1k: "~$39", highlight: false },
              { src: "Apollo.io", plan: "Professional (annual)", monthly: "$79/mo", credits: "2,000/mo", per1k: "~$39.50", highlight: false },
              { src: "Snov.io", plan: "Starter (annual)", monthly: "$29.25/mo", credits: "1,000/mo", per1k: "~$29", highlight: false },
              { src: "Snov.io", plan: "Pro S (annual)", monthly: "$74.25/mo", credits: "5,000/mo", per1k: "~$14.85", highlight: false },
              { src: "Lusha", plan: "Starter (annual)", monthly: "$37.45/mo", credits: "400/mo", per1k: "~$93.60", highlight: false },
              { src: "ZoomInfo", plan: "Professional (est.)", monthly: "~$1,250/mo", credits: "~417/mo (5k/yr)", per1k: "~$3,000", highlight: false },
              { src: "Apify (Owle — active)", plan: "Free ($5 credit)", monthly: "$0", credits: "~50 domains/mo", per1k: "~$0 (email-only)", highlight: true },
            ].map(row => (
              <tr key={row.src + row.plan} className={`border-b last:border-0 ${row.highlight ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{row.src}</td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{row.plan}</td>
                <td className="px-4 py-2.5 text-right text-gray-800 text-xs font-medium">{row.monthly}</td>
                <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{row.credits}</td>
                <td className={`px-4 py-2.5 text-right text-xs font-semibold ${row.highlight ? "text-blue-700" : "text-gray-700"}`}>{row.per1k}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Platform summary table */}
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
              <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs">🆓 Free tier</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Pay monthly</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Pay annually</th>
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
                <td className="px-3 py-3 text-center text-sm">{p.has_free ? <span className="text-green-600 font-medium">✓</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 text-sm">${p.entry_monthly}/mo</td>
                <td className="px-4 py-3 text-right font-medium text-green-700 text-sm">${p.entry_annual}/mo</td>
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

      {/* Detail panel */}
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
                  <p className="text-xs text-gray-400 mb-0.5">Free Tier</p>
                  <p className={`font-semibold text-sm ${active.has_free ? "text-green-700" : "text-gray-400"}`}>{active.has_free ? "Yes" : "No"}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Pay monthly (entry)</p>
                  <p className="font-bold text-gray-900">${active.entry_monthly}/mo</p>
                </div>
                <div className="flex-1 bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Pay annually (entry)</p>
                  <p className="font-bold text-green-700">${active.entry_annual}/mo</p>
                  <p className="text-xs text-green-600">{Math.round((1 - active.entry_annual / active.entry_monthly) * 100)}% saving</p>
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
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Monthly billing</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Annual billing (per mo)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Credits / Volume</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  {active.plans.map(plan => (
                    <tr key={plan.name} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 text-sm">{plan.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700 text-sm">{plan.billed_monthly}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700 text-sm">{plan.billed_annual}</td>
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

      <p className="text-xs text-gray-400 text-center pb-4">Pricing sourced from official pages · April 2026 · Subject to change · All prices in USD</p>
    </div>
  );
}
