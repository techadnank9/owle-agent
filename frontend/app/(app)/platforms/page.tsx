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

      {/* Best solution recommendation */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl overflow-hidden text-white">
        <div className="px-5 py-4 border-b border-blue-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">★</span>
            <h2 className="font-bold text-white">Best Solution — What You Should Actually Do</h2>
          </div>
          <p className="text-xs text-blue-200 mt-0.5">Recommended action plan for Owle based on your current setup and budget</p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-blue-500">
          {/* Phase 1 */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Phase 1</span>
              <span className="text-sm font-semibold text-white">Start Now</span>
            </div>
            <p className="text-xs text-blue-200 mb-3">Get Owle fully working · &lt;100 leads/mo</p>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { s: "Render", p: "Starter", c: "$7/mo", note: "Keep backend always-on" },
                { s: "Hunter.io", p: "Starter", c: "$49/mo", note: "Fixes enrichment — 2,000 searches/mo" },
                { s: "Anthropic", p: "Pay-as-you-go", c: "~$10–20/mo", note: "ICP scoring + email drafts" },
                { s: "Apify", p: "Free credit", c: "$0/mo", note: "Fallback email scraping" },
                { s: "Apollo.io", p: "Skip for now", c: "$0/mo", note: "Web UI only — free plan 403s API" },
              ].map(r => (
                <div key={r.s} className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-medium text-white">{r.s}</span>
                    <span className="text-blue-300 ml-1 text-xs">{r.p}</span>
                    <p className="text-xs text-blue-200">{r.note}</p>
                  </div>
                  <span className="font-bold text-white whitespace-nowrap text-sm">{r.c}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-blue-500">
              <p className="text-xs text-blue-200">Monthly total</p>
              <p className="text-2xl font-bold text-white">~$66–76<span className="text-sm font-normal text-blue-300">/mo</span></p>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-white text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Phase 2</span>
              <span className="text-sm font-semibold text-white">Scale Up</span>
            </div>
            <p className="text-xs text-blue-200 mb-3">Higher volume + 3 enrichment sources · 100–500 leads/mo</p>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { s: "Render", p: "Starter", c: "$7/mo", note: "Same" },
                { s: "Hunter.io", p: "Starter", c: "$49/mo", note: "Same — primary source" },
                { s: "Apollo.io", p: "Basic", c: "$49/mo", note: "Upgrade fixes API 403 — adds 1,000 more contacts/mo from 275M database" },
                { s: "Apify", p: "Starter", c: "$49/mo", note: "Enough credits for real fallback volume" },
                { s: "Anthropic", p: "Pay-as-you-go", c: "~$20–40/mo", note: "Higher usage as leads grow" },
              ].map(r => (
                <div key={r.s} className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-medium text-white">{r.s}</span>
                    <span className="text-blue-300 ml-1 text-xs">{r.p}</span>
                    <p className="text-xs text-blue-200">{r.note}</p>
                  </div>
                  <span className="font-bold text-white whitespace-nowrap text-sm">{r.c}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-blue-500">
              <p className="text-xs text-blue-200">Monthly total</p>
              <p className="text-2xl font-bold text-white">~$174–194<span className="text-sm font-normal text-blue-300">/mo</span></p>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Phase 3</span>
              <span className="text-sm font-semibold text-white">Full Growth</span>
            </div>
            <p className="text-xs text-blue-200 mb-3">Production-grade infrastructure · 500–1,000+ leads/mo</p>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { s: "Phase 2 stack", p: "", c: "~$174/mo", note: "Everything from Phase 2" },
                { s: "Supabase", p: "Pro", c: "$25/mo", note: "8 GB DB + daily backups — needed when DB grows" },
                { s: "AgentMail", p: "Developer", c: "$20/mo", note: "Remove reply inbox daily cap" },
                { s: "Hunter.io", p: "→ Growth", c: "$149/mo", note: "Upgrade from Starter — 10,000 searches/mo" },
                { s: "Anthropic", p: "Pay-as-you-go", c: "~$50–100/mo", note: "Full pipeline at scale" },
              ].map(r => (
                <div key={r.s} className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-medium text-white">{r.s}</span>
                    {r.p && <span className="text-blue-300 ml-1 text-xs">{r.p}</span>}
                    <p className="text-xs text-blue-200">{r.note}</p>
                  </div>
                  <span className="font-bold text-white whitespace-nowrap text-sm">{r.c}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-blue-500">
              <p className="text-xs text-blue-200">Monthly total</p>
              <p className="text-2xl font-bold text-white">~$368–468<span className="text-sm font-normal text-blue-300">/mo</span></p>
            </div>
          </div>
        </div>

        {/* Bottom callout */}
        <div className="px-5 py-3 bg-blue-800/40 flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-0.5">The math is simple</p>
            <p className="text-xs text-blue-200">One closed SNF contract = $10,000–50,000/year. Phase 1 stack at $66/mo = <strong className="text-white">$792/year</strong>. A single deal pays for <strong className="text-white">12–60 years</strong> of the stack. Start with Phase 1 today — upgrade only when volume demands it.</p>
          </div>
          <div className="shrink-0 bg-blue-500/50 rounded-lg px-4 py-2 text-center">
            <p className="text-xs text-blue-200">Do right now</p>
            <p className="text-sm font-bold text-white">Subscribe to<br/>Hunter Starter</p>
            <p className="text-xs text-blue-300 mt-0.5">$49/mo → fixes everything</p>
          </div>
        </div>
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

      {/* Cost at scale table */}
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

      {/* Volume comparison table */}
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
                { v: 10,   owle: 106, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 100,  owle: 110, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 200,  owle: 115, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 500,  owle: 130, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 700,  owle: 140, apollo: 49,  hunter: 49, snovio: 39, diy: 146 },
                { v: 1000, owle: 155, apollo: 49,  hunter: 49, snovio: 39, diy: 146, limitNote: true },
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

        {/* What's included legend */}
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
          <p className="text-xs text-gray-400 mt-1">Owle variable cost: ~$0.05/lead (Anthropic Claude for scoring + email drafting). Fixed: Render $7 + Hunter $49 + Apify $49 = $105 base.</p>
        </div>
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

      {/* Owle stack subscriptions */}
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
                { service: "Apify", plan: "Starter", cost: "$49/mo", what: "~$49 in actor credits/mo. Easy-email-finder actor costs ~0.5–1 CU per domain = ~50–100 lookups on free $5 credit (not enough). Starter gives ~500–1,000 lookups. Use as fallback when Hunter finds nothing.", status: "upgrade needed", color: "text-amber-500" },
                { service: "Apollo.io", plan: "Basic", cost: "$49/mo", what: "1,000 export credits/mo with API access. Owle currently gets 403 because you're on the free plan — upgrading to Basic unlocks the People Search API and fixes enrichment. Organization tier adds higher rate limits + SSO.", status: "upgrade to fix", color: "text-amber-500" },
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
              <p className="text-2xl font-bold text-blue-700">$154–194<span className="text-sm font-normal text-blue-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Render $7 + Hunter $49 + Apify $49 + Anthropic ~$20–60 + Tavily $0.</p>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Growth stack (scaling)</p>
              <p className="text-2xl font-bold text-gray-900">$244–314<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Above + Supabase Pro $25 + AgentMail Dev $20 + higher AI usage.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Value / ROI */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Value You're Getting — What Owle Replaces</h2>
          <p className="text-xs text-gray-500 mt-0.5">At $154–194/mo, what would this cost if done manually or with traditional tools?</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Apollo Pro + Instantly Growth (do-it-yourself stack)", cost: "$147/mo", note: "Apollo Professional $99/mo + Instantly Growth $47/mo — but no AI scoring, no auto-outreach, no reply handling.", color: "bg-yellow-50 border-yellow-100" },
              { label: "Owle Agent starter stack", cost: "$154–194/mo", note: "Everything automated: CMS search → ICP scoring → personalized email drafts → reply classification → meeting booking.", color: "bg-blue-50 border-blue-200" },
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

      <p className="text-xs text-gray-400 text-center pb-4">Pricing sourced from official pages · April 2026 · Subject to change · All prices in USD</p>
    </div>
  );
}
