"use client";
import { useState } from "react";

type Plan = {
  name: string;
  price_monthly: string;
  price_annual: string;
  credits: string;
  key_limits: string;
};

type Platform = {
  name: string;
  tagline: string;
  logo_color: string;
  plans: Plan[];
  pros: string[];
  cons: string[];
  best_for: string;
  data_note?: string;
  has_phones: boolean;
  has_sequences: boolean;
  has_free: boolean;
  entry_price: string;
};

const PLATFORMS: Platform[] = [
  {
    name: "Apollo.io",
    tagline: "All-in-one prospecting + outreach",
    logo_color: "bg-orange-500",
    entry_price: "$49/user/mo",
    has_phones: true,
    has_sequences: true,
    has_free: true,
    plans: [
      { name: "Free", price_monthly: "$0", price_annual: "$0", credits: "50 export credits/mo", key_limits: "No API access, basic filters only" },
      { name: "Basic", price_monthly: "$49/user/mo", price_annual: "~$39/user/mo", credits: "1,000 export credits/mo", key_limits: "Sequences, Salesforce/HubSpot integrations" },
      { name: "Professional", price_monthly: "$99/user/mo", price_annual: "~$79/user/mo", credits: "2,000 export credits/mo", key_limits: "Buying intent, AI email writing, A/B testing" },
      { name: "Organization", price_monthly: "Custom", price_annual: "Custom", credits: "Up to 1M credits/year", key_limits: "API access, SSO, custom roles, dedicated CSM" },
    ],
    pros: [
      "Largest database — 275M+ contacts, 73M+ companies",
      "All-in-one: prospecting + outreach + analytics",
      "Generous free plan (50 credits/mo)",
      "Built-in email sequencing + AI writing",
      "Strong CRM integrations (Salesforce, HubSpot)",
      "LinkedIn Chrome extension",
    ],
    cons: [
      "API locked to highest tier only",
      "Data accuracy inconsistent — mobile numbers especially",
      "Export vs view credits are confusing",
      "Pricing changes frequently",
      "Support poor on lower tiers",
    ],
    best_for: "SMB/mid-market sales teams wanting all-in-one prospecting + outreach at a mid-range price",
    data_note: "Pricing confirmed via GetApp/public sources — Apollo's pricing page uses dynamic JS rendering.",
  },
  {
    name: "Hunter.io",
    tagline: "Domain-based email finder",
    logo_color: "bg-yellow-500",
    entry_price: "$34/mo (annual)",
    has_phones: false,
    has_sequences: true,
    has_free: true,
    plans: [
      { name: "Free", price_monthly: "$0", price_annual: "$0", credits: "50 searches/mo, 50 verifications/mo", key_limits: "1 email account, 500 recipients/sequence" },
      { name: "Starter", price_monthly: "$49/mo", price_annual: "$34/mo ($408/yr)", credits: "2,000 searches/mo", key_limits: "3 email accounts, AI writing assistant, advanced filters" },
      { name: "Growth", price_monthly: "$149/mo", price_annual: "$104/mo ($1,248/yr)", credits: "10,000 searches/mo", key_limits: "10 email accounts, 5,000 recipients/sequence" },
      { name: "Scale", price_monthly: "$299/mo", price_annual: "$209/mo ($2,508/yr)", credits: "25,000 searches/mo", key_limits: "20 email accounts, unlimited Signals" },
      { name: "Enterprise", price_monthly: "Custom", price_annual: "Custom", credits: "Custom", key_limits: "Dedicated manager, SLA, custom integrations" },
    ],
    pros: [
      "Best domain-search — finds all emails at a company instantly",
      "Simple transparent public pricing",
      "Unlimited team members on all plans",
      "Built-in email warmup + outreach campaigns",
      "Strong email verification accuracy",
      "30% annual discount",
    ],
    cons: [
      "Email only — no phone/mobile numbers",
      "No intent data or firmographic enrichment",
      "Smaller contact database than Apollo or ZoomInfo",
      "No LinkedIn integration",
    ],
    best_for: "SDRs and marketers who need verified professional emails by domain — not full contact enrichment",
  },
  {
    name: "Instantly.ai",
    tagline: "Cold email sending at scale",
    logo_color: "bg-blue-500",
    entry_price: "$37.60/mo (annual)",
    has_phones: false,
    has_sequences: true,
    has_free: false,
    plans: [
      { name: "Outreach — Growth", price_monthly: "$47/mo", price_annual: "$37.60/mo", credits: "5,000 emails/mo, 1,000 active contacts", key_limits: "Unlimited email accounts + warmup" },
      { name: "Outreach — Hypergrowth", price_monthly: "$97/mo", price_annual: "$77.60/mo", credits: "100,000 emails/mo, 25,000 contacts", key_limits: "Advanced analytics, premium support" },
      { name: "Outreach — Light Speed", price_monthly: "$358/mo", price_annual: "$286.30/mo", credits: "500,000 emails/mo, 100,000 contacts", key_limits: "Smart inboxing/sending rotation" },
      { name: "Credits — Growth", price_monthly: "$47/mo", price_annual: "—", credits: "1,500–2,000 lead credits/mo", key_limits: "Lead data sourcing — separate subscription" },
      { name: "Credits — Supersonic", price_monthly: "$97/mo", price_annual: "—", credits: "5,000–7,500 credits/mo", key_limits: "Higher volume lead sourcing" },
    ],
    pros: [
      "Best-in-class cold email sending infrastructure",
      "Unlimited email accounts + warmup on all plans",
      "Very affordable entry point",
      "Strong deliverability reputation",
      "Loved by cold email agencies",
    ],
    cons: [
      "Outreach and data are two separate paid subscriptions — budget ~$94/mo minimum",
      "No native CRM",
      "Contact data quality is secondary to sending",
      "No phone numbers",
      "No free tier",
    ],
    best_for: "Cold email agencies and high-volume outbound teams who need massive send scale cheaply",
  },
  {
    name: "ZoomInfo",
    tagline: "Enterprise B2B data powerhouse",
    logo_color: "bg-indigo-600",
    entry_price: "~$15,000/yr",
    has_phones: true,
    has_sequences: true,
    has_free: false,
    plans: [
      { name: "SalesOS Professional", price_monthly: "Annual only", price_annual: "~$14,995/yr (1 user, est.)", credits: "1,000–5,000 bulk exports/yr", key_limits: "Core database, basic intent, LinkedIn integration" },
      { name: "SalesOS Advanced", price_monthly: "Annual only", price_annual: "$24,995–$39,995/yr (est.)", credits: "Higher exports + advanced intent", key_limits: "Org charts, technographics, buying intent" },
      { name: "SalesOS Elite", price_monthly: "Annual only", price_annual: "Custom ($40K+)", credits: "Negotiated", key_limits: "Full suite, API, dedicated CSM, conversation intelligence" },
    ],
    pros: [
      "Most comprehensive B2B database — 260M+ professionals",
      "Best-in-class buying intent data (Bombora partnership)",
      "Org charts + technographics for enterprise deal navigation",
      "Highest accuracy US phone/mobile data",
      "Conversation intelligence (Chorus.ai) on higher tiers",
    ],
    cons: [
      "Extremely expensive — priced out of SMB market",
      "Annual contracts only — no monthly billing",
      "Full pricing requires sales call + negotiation",
      "Steep learning curve",
      "Weaker coverage outside North America",
      "Constant upsell pressure",
    ],
    best_for: "Enterprise teams with $15K+/yr budgets needing highest-accuracy data, intent signals, and full GTM stack",
    data_note: "Pricing fully gated — no public prices. Estimates from widely reported industry figures.",
  },
  {
    name: "Lusha",
    tagline: "Direct-dial phone numbers via LinkedIn",
    logo_color: "bg-pink-500",
    entry_price: "$37.45/mo (annual)",
    has_phones: true,
    has_sequences: false,
    has_free: true,
    plans: [
      { name: "Free", price_monthly: "$0", price_annual: "$0", credits: "40 credits/mo", key_limits: "1 email = 1 credit, 1 phone = 10 credits" },
      { name: "Starter", price_monthly: "$49.90/mo", price_annual: "$37.45/mo ($449/yr)", credits: "400 credits/mo", key_limits: "Email + phone reveal, CRM sync, prospecting filters" },
      { name: "Professional", price_monthly: "$69.90/mo", price_annual: "$52.45/mo ($629/yr)", credits: "600 credits/mo", key_limits: "Enrichment API, advanced filters, bulk actions" },
      { name: "Premium", price_monthly: "$399.90/mo", price_annual: "$299.95/mo ($3,599/yr)", credits: "3,400 credits/mo", key_limits: "Team features, per-user credit controls" },
      { name: "Scale", price_monthly: "Custom", price_annual: "Custom", credits: "Custom", key_limits: "SSO, dedicated CSM, custom integrations" },
    ],
    pros: [
      "Best phone coverage — top choice for direct-dial cold calling",
      "Clean LinkedIn Chrome extension",
      "Unused credits roll over (up to 2× plan limit)",
      "Transparent public pricing",
      "Good GDPR/CCPA compliance tooling",
    ],
    cons: [
      "Phone reveals cost 10× more credits than emails",
      "Lower credit limits vs. competitors at same price",
      "US/Western Europe skewed database",
      "No email sequencing or outreach features",
      "Team plans (5+ users) require sales contact",
    ],
    best_for: "Sales reps who need direct-dial numbers for cold calling, especially via LinkedIn Chrome extension",
  },
  {
    name: "Snov.io",
    tagline: "Affordable all-in-one for agencies",
    logo_color: "bg-teal-500",
    entry_price: "$29.25/mo (annual)",
    has_phones: false,
    has_sequences: true,
    has_free: true,
    plans: [
      { name: "Trial", price_monthly: "$0", price_annual: "$0", credits: "50 credits, 100 recipients", key_limits: "No bulk search, no integrations, no API" },
      { name: "Starter", price_monthly: "$39/mo", price_annual: "$29.25/mo ($351/yr)", credits: "1,000 credits/mo, 5,000 recipients", key_limits: "3 mailbox warmups, unlimited campaigns, basic CRM" },
      { name: "Pro S", price_monthly: "$99/mo", price_annual: "$74.25/mo ($891/yr)", credits: "5,000 credits/mo, 25,000 recipients", key_limits: "Unlimited warmups, unlimited AI email, all integrations" },
      { name: "Pro M", price_monthly: "$189/mo", price_annual: "$141.75/mo ($1,701/yr)", credits: "20,000 credits/mo, 100,000 recipients", key_limits: "Higher volume, full analytics" },
      { name: "Ultra", price_monthly: "Custom", price_annual: "Custom", credits: "200K+ credits", key_limits: "Credit rollover, dedicated CSM, bulk management" },
    ],
    pros: [
      "All-in-one: finder + verifier + drip campaigns + CRM",
      "Unlimited team seats on all plans",
      "Generous 25% annual discount",
      "Strong 7-tier email verification",
      "Most affordable entry point with solid features",
    ],
    cons: [
      "Credits shared across team — burns fast with multiple users",
      "UI can feel cluttered",
      "Weaker data coverage outside US/EU",
      "LinkedIn automation is a paid add-on (+$62/mo)",
      "Slower support on lower tiers",
    ],
    best_for: "Small agencies and lean sales teams wanting affordable all-in-one cold outreach without paying separately for each tool",
  },
];

const FEATURE_ICONS: Record<string, string> = {
  phones: "📞",
  sequences: "📧",
  free: "🆓",
};

export default function PlatformsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "pricing" | "proscons">("overview");

  const active = selected ? PLATFORMS.find(p => p.name === selected) : null;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">Real pricing from official sources · Apollo, Hunter, Instantly, ZoomInfo, Lusha, Snov.io</p>
      </div>

      {/* Summary table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Best For</th>
              <th className="text-center px-3 py-3 font-medium text-gray-600">📞</th>
              <th className="text-center px-3 py-3 font-medium text-gray-600">📧</th>
              <th className="text-center px-3 py-3 font-medium text-gray-600">🆓</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Entry Price</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {PLATFORMS.map((p, i) => (
              <tr key={p.name} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.logo_color}`} />
                    <span className="font-medium text-gray-900">{p.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 pl-4">{p.tagline}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">{p.best_for.slice(0, 80)}…</td>
                <td className="px-3 py-3 text-center">{p.has_phones ? "✓" : "—"}</td>
                <td className="px-3 py-3 text-center">{p.has_sequences ? "✓" : "—"}</td>
                <td className="px-3 py-3 text-center">{p.has_free ? "✓" : "—"}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{p.entry_price}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => { setSelected(p.name === selected ? null : p.name); setTab("overview"); }}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    {selected === p.name ? "Close" : "Details →"}
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
          <div className="flex items-center gap-3 px-5 py-4 border-b">
            <span className={`w-3 h-3 rounded-full ${active.logo_color}`} />
            <h2 className="font-semibold text-gray-900 text-lg">{active.name}</h2>
            <span className="text-sm text-gray-400">{active.tagline}</span>
            <div className="ml-auto flex gap-1">
              {(["overview", "pricing", "proscons"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {t === "proscons" ? "Pros & Cons" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {tab === "overview" && (
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Phone Numbers</p>
                  <p className={`font-semibold ${active.has_phones ? "text-green-700" : "text-gray-400"}`}>{active.has_phones ? "Yes" : "No"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Email Sequences</p>
                  <p className={`font-semibold ${active.has_sequences ? "text-green-700" : "text-gray-400"}`}>{active.has_sequences ? "Yes" : "No"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Free Plan</p>
                  <p className={`font-semibold ${active.has_free ? "text-green-700" : "text-gray-400"}`}>{active.has_free ? "Yes" : "No"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Best For</p>
                <p className="text-sm text-gray-700">{active.best_for}</p>
              </div>
              {active.data_note && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ⚠ {active.data_note}
                </p>
              )}
            </div>
          )}

          {tab === "pricing" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Monthly</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Annual</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Credits / Volume</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  {active.plans.map(plan => (
                    <tr key={plan.name} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{plan.name}</td>
                      <td className="px-4 py-3 text-gray-700">{plan.price_monthly}</td>
                      <td className="px-4 py-3 text-gray-700">{plan.price_annual}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{plan.credits}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{plan.key_limits}</td>
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
                      <span className="text-green-500 shrink-0">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">Cons</p>
                <ul className="flex flex-col gap-2">
                  {active.cons.map(c => (
                    <li key={c} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-red-400 shrink-0">✗</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost comparison bar chart */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm">Entry Price Comparison (annual billing)</h2>
        <div className="flex flex-col gap-2">
          {[
            { name: "Snov.io", price: 29.25, max: 1250 },
            { name: "Hunter.io", price: 34, max: 1250 },
            { name: "Instantly.ai", price: 37.60, max: 1250 },
            { name: "Lusha", price: 37.45, max: 1250 },
            { name: "Apollo.io", price: 39, max: 1250 },
            { name: "ZoomInfo", price: 1249.58, max: 1250 },
          ].map(item => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24 shrink-0 text-right">{item.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.name === "ZoomInfo" ? "bg-indigo-400" : "bg-blue-400"}`}
                  style={{ width: `${Math.max((item.price / item.max) * 100, 2)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 w-24 shrink-0">${item.price}/mo</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">* ZoomInfo shown at ~$1,250/mo (annual contract ~$15,000/yr, estimated)</p>
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">Data sourced from official pricing pages · April 2026 · Prices subject to change</p>
    </div>
  );
}
