"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { reprocessReply, manualReply } from "@/lib/api";
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
    accounts: {
      name: string;
      id: string;
      status: string | null;
      raw_data: Record<string, unknown> | null;
      meetings: { id: string; calendar_link: string | null; status: string; proposed_times: string[] | null } [] | null;
    } | null;
    contacts: { email: string | null } | null;
  } | null;
};

type Account = { id: string; name: string };

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

  // Manual reply modal
  const [showManual, setShowManual] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [manualAccountId, setManualAccountId] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [manualFrom, setManualFrom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

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
      .select("*, outreach_actions(subject, body, account_id, accounts(name, id, status, raw_data, meetings(id, calendar_link, status, proposed_times)), contacts(email))")
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

    const keepalive = setInterval(() => {
      fetch(`${API}/health`).catch(() => undefined);
    }, KEEPALIVE_MS);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(keepalive);
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function loadAccounts() {
    const { data } = await supabase.from("accounts").select("id, name").order("name");
    setAccounts((data ?? []) as Account[]);
  }

  function openManual() {
    setManualAccountId("");
    setManualBody("");
    setManualFrom("");
    setSubmitStatus("idle");
    setShowManual(true);
    loadAccounts();
  }

  async function handleManualSubmit() {
    if (!manualAccountId || !manualBody.trim()) return;
    setSubmitting(true);
    setSubmitStatus("idle");
    try {
      await manualReply(manualAccountId, manualBody.trim(), manualFrom.trim());
      setSubmitStatus("ok");
      setTimeout(() => { setShowManual(false); setSubmitStatus("idle"); }, 1200);
    } catch {
      setSubmitStatus("err");
    } finally {
      setSubmitting(false);
    }
  }

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
          <button
            onClick={openManual}
            className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            + Add Reply Manually
          </button>
        </div>
      </div>

      {/* Manual reply modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Add Reply Manually</h2>
              <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Account</label>
                <select
                  value={manualAccountId}
                  onChange={e => setManualAccountId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">Select account…</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Reply text</label>
                <textarea
                  value={manualBody}
                  onChange={e => setManualBody(e.target.value)}
                  rows={6}
                  placeholder="Paste the reply email here…"
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Sender email <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="email"
                  value={manualFrom}
                  onChange={e => setManualFrom(e.target.value)}
                  placeholder="prospect@example.com"
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleManualSubmit}
                disabled={submitting || !manualAccountId || !manualBody.trim()}
                className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-4 py-2 rounded-md"
              >
                {submitting ? "Submitting…" : submitStatus === "ok" ? "✓ Queued!" : "Submit & Process"}
              </button>
              {submitStatus === "err" && <p className="text-xs text-red-500">Failed — check backend</p>}
              <button onClick={() => setShowManual(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

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
