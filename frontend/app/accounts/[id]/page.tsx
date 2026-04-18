"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { enrichAccount } from "@/lib/api";

type AuditEntry = {
  id: string;
  agent_run_id: string;
  node: string;
  action: string;
  rationale: string;
  verified_facts: Record<string, unknown>;
  inferred_assumptions: Record<string, unknown>;
  created_at: string;
};

type Account = {
  id: string;
  name: string;
  type: string | null;
  bed_count: number | null;
  location: string | null;
  icp_score: number | null;
  priority_score: number | null;
  status: string;
  raw_data: Record<string, string>;
};

const NODE_LABELS: Record<string, string> = {
  web_enricher: "CMS Enrichment",
  account_selector: "ICP Scoring",
  stakeholder_mapper: "Stakeholder Map",
  strategy_decider: "Strategy",
  outreach_generator: "Outreach Draft",
  reply_classifier: "Reply Classification",
  meeting_booker: "Meeting Booking",
  learning_updater: "Learning Update",
};

function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "text-gray-400", in_outreach: "text-blue-600", replied: "text-yellow-600",
    meeting_booked: "text-green-600", paused: "text-orange-500", excluded: "text-red-400",
  };
  return map[status] ?? "text-gray-400";
}

function AuditEntryCard({ entry, defaultOpen }: { entry: AuditEntry; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = (entry.rationale && entry.rationale.trim()) ||
    (entry.verified_facts && Object.keys(entry.verified_facts).length > 0) ||
    (entry.inferred_assumptions && Object.keys(entry.inferred_assumptions).length > 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => hasDetails && setOpen(o => !o)}
      >
        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600 shrink-0">
          {NODE_LABELS[entry.node] ?? entry.node}
        </span>
        <span className="text-sm text-gray-700 flex-1 truncate">{entry.action}</span>
        <span className="text-xs text-gray-400 shrink-0">{new Date(entry.created_at).toLocaleTimeString()}</span>
        {hasDetails && <span className="text-gray-300 text-xs shrink-0">{open ? "▲" : "▼"}</span>}
      </button>

      {open && hasDetails && (
        <div className="px-4 pb-4 bg-white border-t flex flex-col gap-3">
          {entry.rationale && (
            <ul className="flex flex-col gap-1.5 pt-3">
              {entry.rationale.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean).map((point, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-500">
                  <span className="text-gray-300 mt-0.5 shrink-0">▸</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          {entry.verified_facts && Object.keys(entry.verified_facts).length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-green-600 mb-1.5">Verified Facts</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {Object.entries(entry.verified_facts).map(([k, v]) => (
                  <div key={k} className="flex gap-1.5 text-xs text-gray-500">
                    <span className="text-green-400 shrink-0">✓</span>
                    <span><span className="text-gray-600">{k}:</span> {String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {entry.inferred_assumptions && Object.keys(entry.inferred_assumptions).length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-amber-500 mb-1.5">Inferred Assumptions</p>
              <div className="flex flex-col gap-1">
                {Object.entries(entry.inferred_assumptions).map(([k, v]) => (
                  <div key={k} className="flex gap-1.5 text-xs text-gray-500">
                    <span className="text-amber-300 shrink-0">~</span>
                    <span><span className="text-gray-600">{k}:</span> {String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<string | null>(null);
  const [showOldRuns, setShowOldRuns] = useState(false);
  const [contacts, setContacts] = useState<{id: string; name: string | null; title: string; email: string | null; linkedin_url: string | null; source: string; confidence: number | null}[]>([]);

  function loadData() {
    supabase.from("accounts").select("*").eq("id", id).single().then(({ data }) => setAccount(data));
    supabase.from("audit_log").select("*").eq("account_id", id).order("created_at").then(({ data }) => setAuditLog(data ?? []));
    supabase.from("contacts").select("*").eq("account_id", id).order("confidence", { ascending: false }).then(({ data }) => setContacts(data ?? []));
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function handleEnrich() {
    setEnriching(true);
    setEnrichMsg(null);
    try {
      await enrichAccount(id);
      setEnrichMsg("✓ CMS lookup + re-scoring running in background");
    } catch (e: unknown) {
      setEnrichMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnriching(false);
    }
  }

  if (!account) return <p className="text-sm text-gray-400">Loading…</p>;

  // Group by agent_run_id, sorted newest first
  const runMap = new Map<string, AuditEntry[]>();
  for (const entry of auditLog) {
    const run = entry.agent_run_id ?? "unknown";
    if (!runMap.has(run)) runMap.set(run, []);
    runMap.get(run)!.push(entry);
  }
  const runs = Array.from(runMap.entries()).reverse(); // newest first
  const latestRun = runs[0];
  const olderRuns = runs.slice(1);

  const raw = account.raw_data;
  const facilityRows: { label: string; value: string; link?: string }[] = [];
  if (raw) {
    if (raw.address) facilityRows.push({ label: "Address", value: raw.address });
    if (raw.phone) facilityRows.push({ label: "Phone", value: raw.phone });
    if (raw.website) facilityRows.push({ label: "Website", value: (raw.website).replace(/^https?:\/\//, "").replace(/\/$/, ""), link: raw.website });
    if (raw.linkedin_company_url) facilityRows.push({ label: "LinkedIn", value: "View Company →", link: raw.linkedin_company_url });
    if (raw.category) facilityRows.push({ label: "Category", value: raw.category });
    if (raw.rating) facilityRows.push({ label: "Google Rating", value: `★ ${raw.rating}${raw.reviews_count ? ` (${raw.reviews_count})` : ""}` });
    if (raw.email) facilityRows.push({ label: "Email", value: raw.email });
    if (raw.bed_count) facilityRows.push({ label: "Beds (Apify)", value: String(raw.bed_count) });
    if (raw.ownership_type) facilityRows.push({ label: "Ownership", value: raw.ownership_type });
    if (raw.cms_overall_rating) facilityRows.push({ label: "CMS Rating", value: `${raw.cms_overall_rating}/5` });
    if (raw.cms_staffing_rating) facilityRows.push({ label: "CMS Staffing", value: `${raw.cms_staffing_rating}/5` });
    if (raw.nursing_staff_turnover_pct) facilityRows.push({ label: "Nurse Turnover", value: `${raw.nursing_staff_turnover_pct}%` });
    if (raw.cms_fines_count && raw.cms_fines_count !== "0") facilityRows.push({ label: "CMS Fines", value: `${raw.cms_fines_count} ($${raw.cms_fines_total_usd})` });
    if (raw.parent_organization) facilityRows.push({ label: "Parent Org", value: raw.parent_organization });
    if (raw.contact_email) facilityRows.push({ label: "Contact Email", value: raw.contact_email });
    if (raw.contact_phone) facilityRows.push({ label: "Contact Phone", value: raw.contact_phone });

  }

  // LinkedIn profiles from web_enricher
  type LinkedInProfile = { full_name: string; headline: string; job_title: string; company: string; email: string; linkedin_url: string; location: string };
  const linkedinProfiles: LinkedInProfile[] = (raw?.linkedin_profiles as unknown as LinkedInProfile[]) ?? [];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">

      {/* Header card */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{account.name}</h1>
            <p className="text-sm text-gray-500">
              {account.location}{account.bed_count ? ` · ${account.bed_count} beds` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium capitalize ${statusColor(account.status)}`}>
              {account.status.replace("_", " ")}
            </span>
            <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching}>
              {enriching ? "Running…" : "Enrich & Re-score"}
            </Button>
          </div>
        </div>
        {enrichMsg && <p className="text-xs text-gray-500 mb-3">{enrichMsg}</p>}

        {/* Scores */}
        <div className="flex gap-6 text-sm mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">ICP Score</p>
            <p className="text-2xl font-bold text-gray-900">{account.icp_score != null ? Math.round(account.icp_score) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Priority Score</p>
            <p className="text-2xl font-bold text-gray-900">{account.priority_score != null ? Math.round(account.priority_score) : "—"}</p>
          </div>
        </div>

        {/* Facility details */}
        {facilityRows.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Facility Details</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {facilityRows.map(({ label, value, link }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  {link
                    ? <a href={link} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline truncate block">{value}</a>
                    : <p className="text-sm text-gray-800">{value}</p>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contacts & LinkedIn Profiles */}
      {(contacts.length > 0 || linkedinProfiles.length > 0) && (
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Contacts & Decision Makers</p>

          {/* Supabase contacts (from stakeholder_mapper) */}
          {contacts.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {contacts.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{c.name || "Unknown"}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c.source === "verified" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                        {c.source}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      {c.email && <a href={`mailto:${c.email}`} className="text-xs text-blue-500 hover:underline">{c.email}</a>}
                      {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">LinkedIn →</a>}
                    </div>
                  </div>
                  {c.confidence != null && (
                    <span className="text-xs text-gray-400 shrink-0">{Math.round(c.confidence * 100)}% conf</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* LinkedIn profiles from web_enricher (dev_fusion scraper) */}
          {linkedinProfiles.length > 0 && (
            <div>
              {contacts.length > 0 && <p className="text-xs text-gray-400 mb-2 mt-2">LinkedIn profiles found</p>}
              <div className="flex flex-col gap-3">
                {linkedinProfiles.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{p.job_title || p.headline}</span>
                      </div>
                      {p.location && <p className="text-xs text-gray-400 mt-0.5">{p.location}</p>}
                      <div className="flex gap-4 mt-1 flex-wrap">
                        {p.email && <a href={`mailto:${p.email}`} className="text-xs text-blue-500 hover:underline">{p.email}</a>}
                        {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">View Profile →</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Audit Log</h2>
        {auditLog.length === 0 ? (
          <p className="text-sm text-gray-400">No audit entries yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Latest run */}
            {latestRun && (
              <div>
                <p className="text-xs text-gray-400 mb-2">
                  Latest run · {new Date(latestRun[1][0].created_at).toLocaleString()}
                </p>
                <div className="flex flex-col gap-1.5">
                  {latestRun[1].map((entry, i) => (
                    <AuditEntryCard key={entry.id} entry={entry} defaultOpen={i === latestRun[1].length - 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Older runs collapsed */}
            {olderRuns.length > 0 && (
              <div>
                <button
                  className="text-xs text-gray-400 hover:text-gray-600 underline mb-2"
                  onClick={() => setShowOldRuns(o => !o)}
                >
                  {showOldRuns ? "Hide" : "Show"} {olderRuns.length} older run{olderRuns.length > 1 ? "s" : ""}
                </button>
                {showOldRuns && olderRuns.map(([runId, entries]) => (
                  <div key={runId} className="mb-4">
                    <p className="text-xs text-gray-300 mb-2">
                      Run · {new Date(entries[0].created_at).toLocaleString()}
                    </p>
                    <div className="flex flex-col gap-1.5 opacity-60">
                      {entries.map(entry => (
                        <AuditEntryCard key={entry.id} entry={entry} defaultOpen={false} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
