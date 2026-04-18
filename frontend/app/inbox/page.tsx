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
  outreach_actions: {
    subject: string | null;
    accounts: { name: string } | null;
  } | null;
};

export default function InboxPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("replies")
      .select("*, outreach_actions(subject, accounts(name))")
      .order("received_at", { ascending: false });
    setReplies((data ?? []) as Reply[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inbox-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Reply Inbox</h1>
        <p className="text-sm text-gray-500">{replies.length} replies</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : replies.length === 0 ? (
        <p className="text-sm text-gray-400">No replies yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {replies.map((r) => <ReplyCard key={r.id} reply={r} />)}
        </div>
      )}
    </div>
  );
}
