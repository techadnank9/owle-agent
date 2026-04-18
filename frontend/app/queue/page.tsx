"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { OutreachCard } from "@/components/OutreachCard";

type OutreachAction = {
  id: string;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  status: string;
  accounts: { name: string; icp_score: number | null; location: string | null } | null;
};

export default function QueuePage() {
  const [items, setItems] = useState<OutreachAction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("outreach_actions")
      .select("*, accounts(name, icp_score, location)")
      .eq("status", "pending_approval")
      .order("created_at");
    setItems((data ?? []) as OutreachAction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("queue-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_actions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Approval Queue</h1>
        <p className="text-sm text-gray-500">{items.length} pending</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Queue is empty — upload accounts to generate drafts.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => <OutreachCard key={item.id} action={item} onUpdate={load} />)}
        </div>
      )}
    </div>
  );
}
