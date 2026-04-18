"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

type AuditEntry = {
  id: string;
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

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    supabase.from("accounts").select("*").eq("id", id).single().then(({ data }) => setAccount(data));
    supabase
      .from("audit_log")
      .select("*")
      .eq("account_id", id)
      .order("created_at")
      .then(({ data }) => setAuditLog(data ?? []));
  }, [id]);

  if (!account) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{account.name}</h1>
            <p className="text-sm text-gray-500">{account.location} · {account.bed_count ? `${account.bed_count} beds` : "—"}</p>
          </div>
          <Badge variant="outline" className="capitalize">{account.status.replace("_", " ")}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-1">ICP Score</p>
            <p className="font-semibold text-gray-900">{account.icp_score != null ? Math.round(account.icp_score) : "—"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Priority Score</p>
            <p className="font-semibold text-gray-900">{account.priority_score != null ? Math.round(account.priority_score) : "—"}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Audit Log</h2>
        <div className="flex flex-col gap-2">
          {auditLog.length === 0 ? (
            <p className="text-sm text-gray-400">No audit entries yet.</p>
          ) : auditLog.map((entry) => (
            <div key={entry.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{entry.node}</span>
                <span className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-gray-700">{entry.action}</p>
              {entry.rationale && <p className="text-xs text-gray-400 mt-1">{entry.rationale}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
