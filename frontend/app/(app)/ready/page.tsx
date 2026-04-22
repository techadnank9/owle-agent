"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { OutreachCard } from "@/components/OutreachCard";
import { Badge } from "@/components/ui/badge";

type RawData = {
  contact_email?: string;
  all_emails?: string[];
  linkedin_profiles?: Array<{ full_name?: string; linkedin_url?: string; headline?: string }>;
};

type OutreachAction = {
  id: string;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  status: string;
  account_id: string;
  accounts: { name: string; icp_score: number | null; location: string | null; raw_data?: RawData } | null;
  contacts: { name: string | null; title: string | null; email: string | null; linkedin_url: string | null } | null;
};

type AccountGroup = {
  account_id: string;
  name: string;
  location: string | null;
  icp_score: number | null;
  drafts: OutreachAction[];
};

export default function ReadyToSendPage() {
  const [items, setItems] = useState<OutreachAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "email" | "linkedin">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: actions } = await supabase
      .from("outreach_actions")
      .select("*, accounts(name, icp_score, location, raw_data), contacts(name, title, email, linkedin_url)")
      .eq("status", "approved");

    if (!actions) { setLoading(false); return; }

    const missingIds = [...new Set(actions.filter(a => !a.contacts).map(a => a.account_id))];
    const contactMap: Record<string, OutreachAction["contacts"]> = {};
    if (missingIds.length) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("account_id, name, title, email, linkedin_url, confidence")
        .in("account_id", missingIds)
        .order("confidence", { ascending: false });
      for (const c of contacts ?? []) {
        if (!contactMap[c.account_id]) contactMap[c.account_id] = c;
      }
    }

    const nameFromUrl = (url: string | null | undefined): string | null => {
      if (!url) return null;
      const m = url.match(/\/in\/([^/?]+)/);
      if (!m) return null;
      return m[1].replace(/-\w+$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    };

    const merged = actions.map(a => {
      const rawData = (a.accounts as OutreachAction["accounts"])?.raw_data;
      const rawEmail = rawData?.all_emails?.[0] ?? rawData?.contact_email ?? null;
      const firstProfile = rawData?.linkedin_profiles?.[0];
      const rawLinkedIn = firstProfile?.linkedin_url ?? null;
      const rawName = (firstProfile?.full_name || nameFromUrl(firstProfile?.linkedin_url)) ?? null;
      const rawTitle = firstProfile?.headline ?? null;

      const base = a.contacts ?? contactMap[a.account_id] ?? null;
      const mergedContact = base
        ? { ...base, email: base.email ?? rawEmail, linkedin_url: base.linkedin_url ?? rawLinkedIn, name: base.name ?? rawName, title: base.title ?? rawTitle }
        : (rawEmail || rawLinkedIn || rawName)
          ? { name: rawName, title: rawTitle, email: rawEmail, linkedin_url: rawLinkedIn }
          : null;

      return { ...a, contacts: mergedContact };
    });
    setItems(merged as OutreachAction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void load(); }, 0);
    const channel = supabase
      .channel("ready-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_actions" }, load)
      .subscribe();
    return () => { clearTimeout(initialLoad); supabase.removeChannel(channel); };
  }, [load]);

  // Group by account, sorted by ICP desc
  const grouped = new Map<string, AccountGroup>();
  for (const item of items) {
    const key = item.account_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        account_id: key,
        name: item.accounts?.name ?? "Unknown",
        location: item.accounts?.location ?? null,
        icp_score: item.accounts?.icp_score ?? null,
        drafts: [],
      });
    }
    grouped.get(key)!.drafts.push(item);
  }

  let groups = Array.from(grouped.values()).sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0));

  if (filter === "email") groups = groups.map(g => ({ ...g, drafts: g.drafts.filter(d => d.channel === "email") })).filter(g => g.drafts.length > 0);
  if (filter === "linkedin") groups = groups.map(g => ({ ...g, drafts: g.drafts.filter(d => d.channel === "linkedin") })).filter(g => g.drafts.length > 0);

  const emailCount = items.filter(i => i.channel === "email").length;
  const linkedinCount = items.filter(i => i.channel === "linkedin").length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Ready to Send</h1>
        <p className="text-sm text-gray-500">
          {grouped.size} accounts · {emailCount} emails · {linkedinCount} LinkedIn
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1">
        {[
          { key: "all" as const, label: `All (${items.length})` },
          { key: "email" as const, label: `Email (${emailCount})` },
          { key: "linkedin" as const, label: `LinkedIn (${linkedinCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium ${
              filter === f.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nothing ready to send yet.</p>
          <p className="text-xs mt-1">Approve drafts in the Approval Queue to see them here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(group => (
            <div key={group.account_id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm font-semibold text-gray-800">{group.name}</span>
                {group.location && <span className="text-xs text-gray-400">{group.location}</span>}
                {group.icp_score != null && (
                  <Badge variant={group.icp_score >= 80 ? "default" : "secondary"} className="ml-auto shrink-0">
                    ICP {Math.round(group.icp_score)}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {group.drafts.map(item => (
                  <OutreachCard key={item.id} action={item} onUpdate={load} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
