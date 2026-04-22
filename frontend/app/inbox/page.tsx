"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ReplyCard } from "@/components/ReplyCard";

type Reply = {
  id: string;
  body: string;
  received_at: string;
  classification: string | null;
  confidence: number | null;
  response_draft: string | null;
  from_email: string | null;
  outreach_actions: {
    subject: string | null;
    body: string | null;
    account_id: string | null;
    accounts: { name: string; id: string; raw_data: Record<string, unknown> | null } | null;
    contacts: { email: string | null } | null;
  } | null;
};

export default function InboxPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("replies")
      .select("*, outreach_actions(subject, body, account_id, accounts(name, id, raw_data), contacts(email))")
      .order("received_at", { ascending: false });
    setReplies((data ?? []) as Reply[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void load();
    }, 0);
    const channel = supabase
      .channel("inbox-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, load)
      .subscribe();
    return () => {
      clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Group replies by account, most recent thread first
  const threads = Object.values(
    replies.reduce<Record<string, Reply[]>>((acc, r) => {
      const accountId = r.outreach_actions?.account_id ?? r.id;
      (acc[accountId] ??= []).push(r);
      return acc;
    }, {})
  ).sort((a, b) => new Date(b[0].received_at).getTime() - new Date(a[0].received_at).getTime());

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Reply Inbox</h1>
        <p className="text-sm text-gray-500">{threads.length} {threads.length === 1 ? "conversation" : "conversations"}</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-gray-400">No replies yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {threads.map((thread) => <ReplyCard key={thread[0].outreach_actions?.account_id ?? thread[0].id} replies={thread} />)}
        </div>
      )}
    </div>
  );
}
