"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { bookMeeting, sendReplyResponse, updateMeetingTime, updateReplyDraft, refineReplyDraft, approveReply } from "@/lib/api";

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern Time — New York" },
  { value: "America/Chicago",     label: "Central Time — Chicago" },
  { value: "America/Denver",      label: "Mountain Time — Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/Phoenix",     label: "Mountain Time — Phoenix" },
  { value: "America/Anchorage",   label: "Alaska Time — Anchorage" },
  { value: "Pacific/Honolulu",    label: "Hawaii Time — Honolulu" },
];
function defaultTz() {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return TIMEZONES.find(t => t.value === local)?.value ?? "America/Los_Angeles";
}
function tomorrow10am() { const d = new Date(); d.setDate(d.getDate() + 1); return { date: d.toISOString().split("T")[0], start: "10:00", end: "10:30" }; }
function parseExistingTime(s: string) { const iso = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/); if (!iso) return null; const [h, m] = iso[2].split(":").map(Number); const eh = Math.floor((h * 60 + m + 30) / 60) % 24; const em = (m + 30) % 60; return { date: iso[1], start: iso[2], end: `${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}` }; }
function fmt12(t: string) { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2,"0")}${h < 12 ? "am" : "pm"}`; }
function buildDisplay(date: string, start: string, end: string) { const d = new Date(`${date}T${start}`); return `${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} ${fmt12(start)} – ${fmt12(end)}`; }

function injectMeetLink(draft: string, meetLink: string): string {
  if (draft.includes(meetLink)) return draft;
  const linkLine = `Join via Google Meet: ${meetLink}`;
  const signOffs = ["Best,", "Best regards,", "Looking forward", "Thanks,", "Thank you,", "Regards,", "Cheers,"];
  for (const s of signOffs) {
    const idx = draft.indexOf(s);
    if (idx !== -1) return draft.slice(0, idx) + linkLine + "\n\n" + draft.slice(idx);
  }
  return draft.trimEnd() + `\n\n${linkLine}`;
}

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
      meetings: { id: string; calendar_link: string | null; status: string; proposed_times: string[] | null }[] | null;
    } | null;
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

function stripQuoted(body: string): string {
  // Remove "On [date]... wrote:" block and everything after (Gmail/Outlook style)
  const onWrote = body.search(/\r?\nOn [\s\S]+wrote:\s*\r?\n/m);
  if (onWrote !== -1) return body.slice(0, onWrote).trim();
  // Fallback: strip lines starting with >
  const lines = body.split("\n");
  const quoteStart = lines.findIndex(l => l.trimStart().startsWith(">"));
  if (quoteStart > 0) return lines.slice(0, quoteStart).join("\n").trim();
  return body.trim();
}

export function ReplyCard({ replies }: { replies: Reply[] }) {
  const sorted = [...replies].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  const latest = sorted[0];
  const cls = latest.classification;
  const colorClass = cls ? (classificationColor[cls] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-400";
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [draftText, setDraftText] = useState(latest.response_draft ?? "");
  const [draftDirty, setDraftDirty] = useState(false);

  useEffect(() => {
    if (!draftDirty) setDraftText(latest.response_draft ?? "");
  }, [latest.id, latest.response_draft]);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const alreadyBooked = ["meeting_booked", "customer", "churned", "nurture"].includes(
    latest.outreach_actions?.accounts?.status ?? ""
  );
  const existingMeeting = latest.outreach_actions?.accounts?.meetings?.find(m => m.status !== "cancelled") ?? null;
  const [displayTime, setDisplayTime] = useState<string | null>(existingMeeting?.proposed_times?.[0] ?? null);
  const existingMeetLink = existingMeeting?.calendar_link ?? null;
  const existingMeetingId = existingMeeting?.id ?? null;
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(alreadyBooked);
  const [meetLink, setMeetLink] = useState<string | null>(existingMeetLink);
  const [outreachActionId, setOutreachActionId] = useState<string | null>(null);

  const _initEdit = () => {
    const t = existingMeeting?.proposed_times?.[0];
    return t ? (parseExistingTime(t) ?? tomorrow10am()) : tomorrow10am();
  };
  const [editingTime, setEditingTime] = useState(false);
  const [savingTime, setSavingTime] = useState(false);
  const [editDate, setEditDate] = useState(() => _initEdit().date);
  const [editStart, setEditStart] = useState(() => _initEdit().start);
  const [editEnd, setEditEnd] = useState(() => _initEdit().end);
  const [editTz, setEditTz] = useState(defaultTz);

  function copyResponse() {
    if (!draftText) return;
    try {
      navigator.clipboard.writeText(draftText);
    } catch {
      const el = document.createElement("textarea");
      el.value = draftText;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  async function saveDraftIfDirty() {
    if (draftDirty) {
      await updateReplyDraft(latest.id, draftText);
      setDraftDirty(false);
    }
  }

  async function handleRefine() {
    if (!refineInstruction.trim()) return;
    setRefining(true);
    try {
      const res = await refineReplyDraft(latest.id, draftText, refineInstruction);
      setDraftText(res.refined);
      setRefineInstruction("");
      await updateReplyDraft(latest.id, res.refined);
      setDraftDirty(false);
    } catch (e) { console.error(e); } finally { setRefining(false); }
  }

  async function handleApproveOnly() {
    setApproving(true);
    try {
      await saveDraftIfDirty();
      await approveReply(latest.id);
      setApproved(true);
    } catch (e) { console.error(e); } finally { setApproving(false); }
  }

  async function handleApproveAndSend() {
    setSending(true);
    try {
      await saveDraftIfDirty();
      await sendReplyResponse(latest.id);
      setSent(true);
      setApproved(true);
    } catch (e) { console.error(e); } finally { setSending(false); }
  }

  async function handleSaveTime() {
    if (!editDate || !editStart || !existingMeetingId) return;
    setSavingTime(true);
    try {
      const display = buildDisplay(editDate, editStart, editEnd);
      const startIso = `${editDate}T${editStart}`;
      const [sh, sm] = editStart.split(":").map(Number);
      const [eh, em] = editEnd.split(":").map(Number);
      const dur = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
      const res = await updateMeetingTime(existingMeetingId, display, startIso, dur, editTz);
      setDisplayTime(display);
      if (res.meet_link) {
        setMeetLink(res.meet_link);
        if (draftText) {
          const injected = injectMeetLink(draftText, res.meet_link);
          if (injected !== draftText) { setDraftText(injected); setDraftDirty(false); }
        }
      }
      setEditingTime(false);
    } catch (e) { console.error(e); } finally { setSavingTime(false); }
  }

  async function handleBookMeeting() {
    if (!accountId || booking || booked) return;
    setBooking(true);
    try {
      const result = await bookMeeting(accountId, proposedTime ?? "TBD");
      if (!result.meet_link) throw new Error("No Meet link returned");
      setBooked(true);
      setMeetLink(result.meet_link);
      if (result.outreach_action_id) setOutreachActionId(result.outreach_action_id);
      if (draftText) {
        const injected = injectMeetLink(draftText, result.meet_link);
        if (injected !== draftText) { setDraftText(injected); setDraftDirty(false); }
      }
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

      {/* Latest message — quoted original stripped */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap border-l-2 border-gray-200 pl-3">
        {stripQuoted(latest.body)}
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
        <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-3 border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-500">Suggested response</p>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-400 px-2" onClick={copyResponse}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* Editable draft */}
          <textarea
            value={draftText}
            onChange={e => { setDraftText(e.target.value); setDraftDirty(true); }}
            onBlur={() => { if (draftDirty) { updateReplyDraft(latest.id, draftText).then(() => setDraftDirty(false)).catch(console.error); } }}
            rows={6}
            className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          />

          {/* AI refine */}
          <div className="flex gap-2">
            <input
              type="text"
              value={refineInstruction}
              onChange={e => setRefineInstruction(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRefine()}
              placeholder="Edit instruction… e.g. make it shorter, add a P.S."
              className="flex-1 text-xs border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 placeholder:text-gray-300"
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineInstruction.trim()}
              className="flex items-center gap-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 rounded-md whitespace-nowrap"
            >
              <span className="text-sm leading-none">✦</span>
              {refining ? "Refining…" : "Use AI"}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <button
              onClick={handleApproveAndSend}
              disabled={sending || sent}
              className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {sent ? "Sent ✓" : sending ? "Sending…" : "Approve & Send"}
            </button>
            <button
              onClick={handleApproveOnly}
              disabled={approving || approved || sent}
              className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {approved ? "Approved ✓" : approving ? "Approving…" : "Approve Only"}
            </button>
          </div>
        </div>
      )}

      {(cls === "interested" || cls === null) && (
        <div className="flex items-center gap-3 pt-1 border-t flex-wrap">
          {booked ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-green-700 font-medium">
                  ✓ Meeting booked{displayTime ? ` · ${displayTime}` : ""}
                </span>
                {meetLink && (
                  <a href={meetLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                    Open Meet →
                  </a>
                )}
                {outreachActionId && (
                  <a href="/ready" className="text-xs text-gray-500 hover:underline">
                    View confirmation email →
                  </a>
                )}
                {existingMeetingId && !editingTime && (
                  <button onClick={() => { const f = _initEdit(); setEditDate(f.date); setEditStart(f.start); setEditEnd(f.end); setEditingTime(true); }}
                    className="text-xs text-blue-500 hover:underline ml-auto">
                    Edit time
                  </button>
                )}
              </div>
              {editingTime && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      className="bg-gray-100 rounded-md px-2.5 py-1.5 text-xs text-gray-700 border-0 focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                    <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                      className="bg-gray-100 rounded-md px-2.5 py-1.5 text-xs text-gray-700 border-0 focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                      className="bg-gray-100 rounded-md px-2.5 py-1.5 text-xs text-gray-700 border-0 focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                    <select value={editTz} onChange={e => setEditTz(e.target.value)}
                      className="bg-gray-100 rounded-md px-2.5 py-1.5 text-xs text-gray-700 border-0 focus:ring-2 focus:ring-blue-400 focus:outline-none">
                      {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveTime} disabled={savingTime}
                      className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-3 py-1.5 rounded-md">
                      {savingTime ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditingTime(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                </div>
              )}
            </div>
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
