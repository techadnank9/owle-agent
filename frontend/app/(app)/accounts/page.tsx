"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AccountCard } from "@/components/AccountCard";
import { UploadButton } from "@/components/UploadButton";
import { PasteEmailsDialog } from "@/components/PasteEmailsDialog";
import { Button } from "@/components/ui/button";
import { enrichAccount } from "@/lib/api";

type Account = {
  id: string;
  name: string;
  type: string | null;
  bed_count: number | null;
  location: string | null;
  icp_score: number | null;
  priority_score: number | null;
  status: string;
  raw_data: Record<string, unknown> | null;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select("id,name,type,bed_count,location,icp_score,priority_score,status,raw_data")
      .order("priority_score", { ascending: false, nullsFirst: false });
    setAccounts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("accounts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === accounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map(a => a.id)));
    }
  }

  async function handleBulkEnrich() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setEnriching(true);
    setEnrichMsg(null);
    let done = 0;
    for (const id of ids) {
      try { await enrichAccount(id); done++; } catch { /* skip */ }
    }
    setEnrichMsg(`✓ ${done} account(s) queued for re-enrichment & re-scoring`);
    setSelected(new Set());
    setSelectMode(false);
    setEnriching(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">{accounts.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setSelectMode(true); setEnrichMsg(null); }}>
                Select & Enrich
              </Button>
              <PasteEmailsDialog onDone={load} />
              <UploadButton onDone={load} />
            </>
          ) : (
            <>
              <button onClick={toggleAll} className="text-xs text-gray-500 hover:text-gray-800 underline">
                {selected.size === accounts.length ? "Deselect all" : "Select all"}
              </button>
              <Button variant="outline" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleBulkEnrich} disabled={selected.size === 0 || enriching}>
                {enriching ? "Queuing…" : `Enrich & Re-score ${selected.size > 0 ? `(${selected.size})` : ""}`}
              </Button>
            </>
          )}
        </div>
      </div>

      {enrichMsg && <p className="text-xs text-gray-500 mb-3">{enrichMsg}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-400">No accounts yet — upload a CSV to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((a) => (
            <div key={a.id} className={`flex items-center gap-2 ${selectMode ? "cursor-pointer" : ""}`}
              onClick={selectMode ? () => toggleSelect(a.id) : undefined}>
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggleSelect(a.id)}
                  onClick={e => e.stopPropagation()}
                  className="accent-gray-900 shrink-0"
                />
              )}
              <div className="flex-1">
                <AccountCard account={a} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
