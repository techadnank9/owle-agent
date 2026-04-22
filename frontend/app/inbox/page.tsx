"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { reprocessReply } from "@/lib/api";
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
    accounts: { name: string; id: string; status: string | null; raw_data: Record<string, unknown> | null } | null;
    contacts: { email: string | null } | null;
  } | null;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEEPALIVE_MS = 10 * 60 * 1000;

export default function InboxPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [wakeStatus, setWakeStatus] = useState<"idle" | "ok" | "err">("idle");
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessStatus, setReprocessStatus] = useState<string | null>(null);
  const pendingReprocess = useRef<Set<string>>(new Set());

  const triggerReprocess = useCallback((replyList: Reply[]) => {
    for (const r of replyList) {
      if (r.classification === null && !pendingReprocess.current.has(r.id)) {
        pendingReprocess.current.add(r.id);
        reprocessReply(r.id).catch(() => pendingReprocess.current.delete(r.id));
      }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("replies")
      .select("*, outreach_actions(subject, body, account_id, accounts(name, id, status, raw_data), contacts(email))")
      .order("received_at", { ascending: false });
    const loaded = (data ?? []) as Reply[];
    setReplies(loaded);
    setLoading(false);
    triggerReprocess(loaded);
  }, [triggerReprocess]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void load(); }, 0);

    const channel = supabase
      .channel("inbox-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, load)
      .subscribe();

    // Keep Render awake — ping /health every 10 minutes
    const keepalive = setInterval(() => {
      fetch(`${API}/health`).catch(() => undefined);
    }, KEEPALIVE_MS);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(keepalive);
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function handleWake() {
    window.open(`${API}/health`, "_blank");
    setWaking(true);
    setWakeStatus("idle");
    try {
      const res = await fetch(`${API}/health`);
      setWakeStatus(res.ok ? "ok" : "err");
    } catch {
      setWakeStatus("err");
    } finally {
      setWaking(false);
      setTimeout(() => setWakeStatus("idle"), 3000);
    }
  }

  async function handleReprocessAll() {
    const unclassified = replies.filter((r) => r.classification === null);
    if (!unclassified.length) {
      setReprocessStatus("Nothing to process");
      setTimeout(() => setReprocessStatus(null), 3000);
      return;
    }
    setReprocessing(true);
    setReprocessStatus(null);
    let count = 0;
    for (const r of unclassified) {
      if (!pendingReprocess.current.has(r.id)) {
        pendingReprocess.current.add(r.id);
        try {
          await reprocessReply(r.id);
          count++;
        } catch {
          pendingReprocess.current.delete(r.id);
        }
      }
    }
    setReprocessing(false);
    setReprocessStatus(`Queued ${count} repl${count === 1 ? "y" : "ies"}`);
    setTimeout(() => setReprocessStatus(null), 4000);
  }

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
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reply Inbox</h1>
          <p className="text-sm text-gray-500">{threads.length} {threads.length === 1 ? "conversation" : "conversations"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleWake}
            disabled={waking}
            className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {waking ? "Pinging…" : wakeStatus === "ok" ? "✓ Awake" : wakeStatus === "err" ? "✗ Unreachable" : "Wake Backend"}
          </button>
          <button
            onClick={handleReprocessAll}
            disabled={reprocessing}
            className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {reprocessing ? "Queuing…" : reprocessStatus ?? "Process Unclassified"}
          </button>
        </div>
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
