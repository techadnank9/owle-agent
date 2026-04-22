"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { bookMeeting, sendReplyResponse } from "@/lib/api";

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

const classificationColor: Record<string, string> = {
  interested: "bg-green-100 text-green-800",
  not_now: "bg-yellow-100 text-yellow-800",
  referral: "bg-blue-100 text-blue-800",
  not_a_fit: "bg-red-100 text-red-800",
  unsubscribe: "bg-gray-100 text-gray-600",
  unclear: "bg-orange-100 text-orange-800",
};

function extractTime(text: string): string | null {
  const match = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))(?:\s+(today|tomorrow))?\b/i);
  if (!match) return null;
  const time = match[1].replace(/\s+/, " ").toUpperCase();
  const day = match[2] ? ` ${match[2].charAt(0).toUpperCase()}${match[2].slice(1)}` : "";
  return `${time}${day}`;
}

export function ReplyCard({ replies }: { replies: Reply[] }) {
  const sorted = [...replies].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  const latest = sorted[0];
  const cls = latest.classification;
  const colorClass = cls ? (classificationColor[cls] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-400";
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const alreadyBooked = ["meeting_booked", "customer", "churned", "nurture"].includes(
    latest.outreach_actions?.accounts?.status ?? ""
  );
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(alreadyBooked);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [outreachActionId, setOutreachActionId] = useState<string | null>(null);

  function copyResponse() {
    if (!latest.response_draft) return;
    navigator.clipboard.writeText(latest.response_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendResponse() {
    if (sending || sent) return;
    setSending(true);
    try {
      await sendReplyResponse(latest.id);
      setSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const accountId = latest.outreach_actions?.account_id ?? null;
  const accountName = latest.outreach_actions?.accounts?.name ?? "Unknown";
  const olderReplies = sorted.slice(1);

  const proposedTime = (() => {
    for (const r of sorted) {
      const t = extractTime(r.body);
      if (t) return t;
    }
    return null;
  })();

  async function handleBookMeeting() {
    if (!accountId || booking || booked) return;
    setBooking(true);
    try {
      const result = await bookMeeting(accountId, proposedTime ?? "TBD");
      if (!result.meet_link) throw new Error("No Meet link returned");
      setBooked(true);
      setMeetLink(result.meet_link);
      if (result.outreach_action_id) setOutreachActionId(result.outreach_action_id);
    } catch (e) {
      console.error(e);
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{accountName}</p>
          {(() => {
            // Prefer the actual reply sender; fall back to contact/raw_data
            const email = latest.from_email
              ?? latest.outreach_actions?.contacts?.email
              ?? (latest.outreach_actions?.accounts?.raw_data as { contact_email?: string; all_emails?: string[] } | null)?.contact_email
              ?? (latest.outreach_actions?.accounts?.raw_data as { all_emails?: string[] } | null)?.all_emails?.[0]
              ?? null;
            return email ? (
              <p className="text-xs text-gray-500">
                {latest.from_email ? "Reply from: " : ""}{email}
              </p>
            ) : null;
          })()}
          <p className="text-xs text-gray-400" suppressHydrationWarning>
            {new Date(latest.received_at).toLocaleString()}
            {replies.length > 1 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-2 text-blue-500 hover:underline"
              >
                {expanded ? "hide" : `+${olderReplies.length} earlier`}
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {cls && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colorClass}`}>
              {cls.replace("_", " ")}
              {latest.confidence != null && ` · ${Math.round(latest.confidence * 100)}%`}
            </span>
          )}
        </div>
      </div>

      {/* Older messages (collapsed by default) */}
      {expanded && olderReplies.map((r) => (
        <div key={r.id} className="flex flex-col gap-1 border-l-2 border-gray-100 pl-3">
          <p className="text-xs text-gray-400" suppressHydrationWarning>{new Date(r.received_at).toLocaleString()}</p>
          <p className="text-sm text-gray-500 whitespace-pre-wrap">{r.body}</p>
        </div>
      ))}

      {/* Latest message */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap border-l-2 border-gray-200 pl-3">
        {latest.body}
      </p>

      {/* Original outreach email */}
      {latest.outreach_actions?.body && (
        <div>
          <button
            onClick={() => setShowOriginal(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
          >
            {showOriginal ? "Hide original email ▲" : "View original email ▼"}
          </button>
          {showOriginal && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-3 flex flex-col gap-1">
              {latest.outreach_actions.subject && (
                <p className="text-xs font-medium text-blue-700">Subject: {latest.outreach_actions.subject}</p>
              )}
              <p className="text-xs text-blue-800 whitespace-pre-wrap">{latest.outreach_actions.body}</p>
            </div>
          )}
        </div>
      )}

      {/* Suggested response */}
      {latest.response_draft && (
        <div className="bg-gray-50 rounded p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">Suggested response</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copyResponse}>
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={handleSendResponse}
                disabled={sending || sent}
              >
                {sent ? "Sent ✓" : sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{latest.response_draft}</p>
        </div>
      )}

      {cls === "interested" && (
        <div className="flex items-center gap-3 pt-1 border-t flex-wrap">
          {booked ? (
            <>
              <span className="text-xs text-green-700 font-medium">
                ✓ Meeting booked{proposedTime ? ` · ${proposedTime}` : ""}
              </span>
              {meetLink && (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Open Meet →
                </a>
              )}
              {outreachActionId && (
                <a href="/ready" className="text-xs text-gray-500 hover:underline">
                  View confirmation email →
                </a>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleBookMeeting}
                disabled={booking || !accountId}
                className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded px-3 py-1.5 transition-colors"
              >
                {booking ? "Booking…" : proposedTime ? `Book Meeting · ${proposedTime}` : "Book Meeting"}
              </button>
              <a href="/meetings" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                View all meetings →
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
