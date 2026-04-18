"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AccountCard } from "@/components/AccountCard";
import { UploadButton } from "@/components/UploadButton";
import { PasteEmailsDialog } from "@/components/PasteEmailsDialog";

type Account = {
  id: string;
  name: string;
  type: string | null;
  bed_count: number | null;
  location: string | null;
  icp_score: number | null;
  priority_score: number | null;
  status: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select("*")
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">{accounts.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <PasteEmailsDialog onDone={load} />
          <UploadButton onDone={load} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-400">No accounts yet — upload a CSV to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
        </div>
      )}
    </div>
  );
}
