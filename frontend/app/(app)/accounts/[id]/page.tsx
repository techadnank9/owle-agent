"use client";
import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { enrichAccount } from "@/lib/api";

type NodeData = {
  action: string;
  rationale: string;
  verified_facts: Record<string, unknown>;
  inferred_assumptions: Record<string, unknown>;
};

type AuditEntry = {
  id: string;
  agent_run_id: string;
  node: string;
  action: string;
  rationale: string;
  verified_facts: Record<string, unknown>;
  inferred_assumptions: Record<string, unknown>;
  nodes: Record<string, NodeData>;
  created_at: string;
  updated_at: string | null;
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

const NODE_ORDER_LIST = [
  "account_selector","web_enricher","stakeholder_mapper",
  "strategy_decider","outreach_generator",
  "reply_classifier","meeting_booker","learning_updater",
];

function NodeTimeline({ nodeName, data, isLast }: { nodeName: string; data: NodeData; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(data.rationale?.trim()) ||
    Object.keys(data.verified_facts || {}).length > 0 ||
    Object.keys(data.inferred_assumptions || {}).length > 0;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-2.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
        {!isLast && <span className="w-px flex-1 bg-gray-100 mt-1" />}
      </div>
      <div className={`flex-1 ${isLast ? "pb-1" : "pb-3"}`}>
        <button
          className="w-full text-left flex items-start gap-2 group"
          onClick={() => hasDetails && setOpen(o => !o)}
        >
          <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600 shrink-0 mt-0.5">
            {NODE_LABELS[nodeName] ?? nodeName}
          </span>
          <span className="text-sm text-gray-700 flex-1 leading-snug">{data.action}</span>
          {hasDetails && (
            <span className="text-gray-300 text-xs shrink-0 mt-1">{open ? "▲" : "▼"}</span>
          )}
        </button>

        {open && (
          <div className="mt-2 pl-1 flex flex-col gap-2">
            {data.rationale?.trim() && (
              <p className="text-xs text-gray-500 leading-relaxed">{data.rationale}</p>
            )}
            {Object.keys(data.verified_facts || {}).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Verified Facts</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {Object.entries(data.verified_facts).map(([k, v]) => (
                    <div key={k} className="flex gap-1 text-xs text-gray-500">
                      <span className="text-green-400 shrink-0">✓</span>
                      <span><span className="text-gray-600">{k}:</span> {String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(data.inferred_assumptions || {}).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">Assumptions</p>
                <div className="flex flex-col gap-0.5">
                  {Object.entries(data.inferred_assumptions).map(([k, v]) => (
                    <div key={k} className="flex gap-1 text-xs text-gray-500">
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
    </div>
  );
}

function AuditRunCard({ entries, defaultOpen }: { entries: AuditEntry[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const primary = entries[0];
  const hasNodes = primary.nodes && Object.keys(primary.nodes).length > 0;

  const sortedNodes = hasNodes
    ? Object.entries(primary.nodes).sort(([a], [b]) => {
        const ai = NODE_ORDER_LIST.indexOf(a);
        const bi = NODE_ORDER_LIST.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
    : [];

  const updatedAt = primary.updated_at ?? primary.created_at;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs text-gray-400 shrink-0" suppressHydrationWarning>
          {new Date(primary.created_at).toLocaleString()}
        </span>
        {hasNodes && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
            {sortedNodes.length} nodes
          </span>
        )}
        <span className="flex-1 text-xs text-gray-400 truncate">
          {hasNodes
            ? sortedNodes.map(([n]) => NODE_LABELS[n] ?? n).join(" → ")
            : primary.action}
        </span>
        <span className="text-gray-300 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t bg-white px-4 py-3">
          {hasNodes ? (
            <div>
              {sortedNodes.map(([nodeName, data], idx) => (
                <NodeTimeline
                  key={nodeName}
                  nodeName={nodeName}
                  data={data}
                  isLast={idx === sortedNodes.length - 1}
                />
              ))}
              {primary.updated_at && primary.updated_at !== primary.created_at && (
                <p className="text-[10px] text-gray-300 mt-2" suppressHydrationWarning>
                  Last updated {new Date(updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            // Backward compat: old multi-row format
            <div className="flex flex-col gap-1.5">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                  <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600 shrink-0">
                    {NODE_LABELS[entry.node] ?? entry.node}
                  </span>
                  <span className="text-sm text-gray-700 flex-1">{entry.action}</span>
                </div>
              ))}
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
  const [inferredOpen, setInferredOpen] = useState(false);
  const [outreachActions, setOutreachActions] = useState<{id: string; channel: string; subject: string | null; status: string; sent_at: string | null}[]>([]);

  const loadData = useCallback(() => {
    supabase.from("accounts").select("*").eq("id", id).single().then(({ data }) => setAccount(data));
    supabase.from("audit_log").select("*").eq("account_id", id).order("created_at").then(({ data }) => setAuditLog(data ?? []));
    supabase.from("contacts").select("*").eq("account_id", id).order("confidence", { ascending: false }).then(({ data }) => setContacts(data ?? []));
    supabase.from("outreach_actions").select("id,channel,subject,status,sent_at").eq("account_id", id).then(({ data }) => setOutreachActions(data ?? []));
  }, [id]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      loadData();
    }, 0);
    const interval = setInterval(loadData, 5000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadData]);

  async function handleEnrich() {
    setEnriching(true);
    setEnrichMsg(null);
    try {
      await enrichAccount(id);
      setEnrichMsg("⏳ Enriching — LinkedIn profiles + re-scoring running… reloading in 30s");
      setTimeout(() => {
        loadData();
        setEnrichMsg("✓ Done — refresh if LinkedIn profiles not showing yet");
        setEnriching(false);
      }, 30000);
    } catch (e: unknown) {
      setEnrichMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
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

  // Extract latest strategy from audit log
  const strategyEntry = [...auditLog].reverse().find(e => e.node === "strategy_decider");
  const strategyAction = strategyEntry?.action ?? "";
  // Parse "strategy: pursue via email (founder_led), angle: ..."
  const stratMatch = strategyAction.match(/strategy:\s*(\w+)\s+via\s+(\S+)\s+\((\w+)\),\s*angle:\s*(.+)/);
  const strategy = stratMatch ? {
    action: stratMatch[1],
    channel: stratMatch[2],
    lead_type: stratMatch[3],
    angle: stratMatch[4],
  } : null;

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
  type LinkedInLocation = string | { parsed?: { text?: string }; linkedinText?: string; countryCode?: string } | null;
  type LinkedInProfile = { full_name: string; headline: string; job_title: string; company: string; email: string; linkedin_url: string; location: LinkedInLocation };
  const linkedinProfiles: LinkedInProfile[] = (raw?.linkedin_profiles as unknown as LinkedInProfile[]) ?? [];
  const locText = (l: LinkedInLocation): string => typeof l === "string" ? l : (l?.parsed?.text || l?.linkedinText || "");
  // Extract readable name from LinkedIn URL slug e.g. "robert-pierce-6a38a830" → "Robert Pierce"
  const nameFromUrl = (url: string): string => {
    try {
      const slug = url.split("/in/")[1]?.split("?")[0] ?? "";
      const parts = slug.split("-").filter(p => !/^\d+[a-f0-9]*$/.test(p));
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    } catch { return ""; }
  };

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

      {/* Strategy — compact card */}
      {strategy && (
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Outreach Strategy</p>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              strategy.action === "pursue" ? "bg-green-100 text-green-700" :
              strategy.action === "pause" ? "bg-yellow-100 text-yellow-700" :
              "bg-orange-100 text-orange-700"
            }`}>{strategy.action}</span>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{strategy.channel}</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{strategy.lead_type.replace("_", " ")}</span>
          </div>
          <p className="text-sm text-gray-600">{strategy.angle}</p>
        </div>
      )}

      {/* Contacts & Decision Makers — always shown */}
      <div className="bg-white border rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Contacts & Decision Makers</p>

        {/* Emails found from website crawler */}
        {raw && (raw.all_emails || raw.contact_email) && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xs font-medium text-green-700 mb-2">Emails from website</p>
            <div className="flex flex-wrap gap-2">
              {((raw.all_emails as unknown as string[]) ?? [raw.contact_email]).filter(Boolean).map((email, i) => (
                <a key={i} href={`mailto:${email}`}
                  className="text-xs text-green-800 bg-green-100 px-2 py-1 rounded hover:bg-green-200 font-mono">
                  {email}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn profiles from dev_fusion (verified) */}
        {linkedinProfiles.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-xs font-medium text-blue-600 mb-1">LinkedIn profiles — verified</p>
            {linkedinProfiles.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{p.full_name || nameFromUrl(p.linkedin_url) || "Unknown"}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{p.job_title || p.headline}</span>
                  </div>
                  {locText(p.location) && <p className="text-xs text-gray-400 mt-0.5">{locText(p.location)}</p>}
                  <div className="flex gap-4 mt-1 flex-wrap">
                    {p.email && <a href={`mailto:${p.email}`} className="text-xs text-blue-700 hover:underline font-medium">{p.email}</a>}
                    {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">View LinkedIn →</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contacts from stakeholder_mapper — collapsed by default */}
        {contacts.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setInferredOpen(o => !o)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 w-fit"
            >
              <span>{inferredOpen ? "▾" : "▸"}</span>
              <span>Inferred roles ({contacts.length})</span>
            </button>
            {inferredOpen && contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{c.name || "Unknown"}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.source === "verified" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                      {c.source}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-0.5 flex-wrap">
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

        {contacts.length === 0 && linkedinProfiles.length === 0 && !raw?.contact_email && (
          <p className="text-sm text-gray-400">No contacts yet — click <strong>Enrich & Re-score</strong> to find emails and LinkedIn profiles.</p>
        )}
      </div>

      {/* Outreach History */}
      {outreachActions.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Outreach History</p>
          <div className="flex flex-col gap-2">
            {outreachActions.map(a => {
              const statusColors: Record<string, string> = {
                draft: "bg-gray-100 text-gray-500",
                pending_approval: "bg-yellow-100 text-yellow-700",
                approved: "bg-blue-100 text-blue-700",
                sent: "bg-green-100 text-green-700",
                failed: "bg-red-100 text-red-600",
              };
              const color = statusColors[a.status] ?? "bg-gray-100 text-gray-500";
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 uppercase shrink-0">{a.channel}</span>
                    <p className="text-sm text-gray-700 truncate">{a.subject || "(no subject)"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{a.status.replace("_", " ")}</span>
                    {a.sent_at && (
                      <span className="text-xs text-gray-400" suppressHydrationWarning>{new Date(a.sent_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {outreachActions.some(a => a.status === "pending_approval") && (
            <a href="/queue" className="text-xs text-blue-500 hover:underline mt-3 inline-block">
              Review pending drafts in Approval Queue →
            </a>
          )}
        </div>
      )}

      {/* Audit Log */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Audit Log</h2>
        {auditLog.length === 0 ? (
          <p className="text-sm text-gray-400">No audit entries yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {latestRun && (
              <AuditRunCard entries={latestRun[1]} defaultOpen={true} />
            )}
            {olderRuns.length > 0 && (
              <div>
                <button
                  className="text-xs text-gray-400 hover:text-gray-600 underline mb-2"
                  onClick={() => setShowOldRuns(o => !o)}
                >
                  {showOldRuns ? "Hide" : "Show"} {olderRuns.length} older run{olderRuns.length > 1 ? "s" : ""}
                </button>
                {showOldRuns && (
                  <div className="flex flex-col gap-3 opacity-60">
                    {olderRuns.map(([runId, entries]) => (
                      <AuditRunCard key={runId} entries={entries} defaultOpen={false} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
