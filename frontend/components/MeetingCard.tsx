"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmMeeting, cancelMeeting, completeMeeting, generateMeetingNotes } from "@/lib/api";
import Link from "next/link";

type Meeting = {
  id: string;
  account_id: string;
  contact_id: string | null;
  status: string;
  outcome: string | null;
  notes: string | null;
  proposed_times: string[] | null;
  confirmed_at: string | null;
  completed_at: string | null;
  calendar_link: string | null;
  accounts: { name: string; location: string | null } | null;
  contacts: { name: string | null; title: string | null; email: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  soft_interest: "bg-yellow-100 text-yellow-700",
  proposed: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-purple-100 text-purple-700",
};

const OUTCOME_COLORS: Record<string, string> = {
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-600",
  nurture: "bg-orange-100 text-orange-700",
};

type Outcome = "won" | "lost" | "nurture";

export function MeetingCard({ meeting, onUpdate }: { meeting: Meeting; onUpdate: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Post-meeting form state
  const [step, setStep] = useState<"idle" | "form">("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);

  const colorClass = STATUS_COLORS[meeting.status] ?? "bg-gray-100 text-gray-500";
  const isActionable = meeting.status === "soft_interest" || meeting.status === "proposed";
  const isConfirmed = meeting.status === "confirmed";
  const isCompleted = meeting.status === "completed";
  const accountName = meeting.accounts?.name ?? "Prospect";

  async function handleConfirm() {
    setConfirming(true);
    try { await confirmMeeting(meeting.id); onUpdate(); } catch (e) { console.error(e); } finally { setConfirming(false); }
  }

  async function handleCancel() {
    setCancelling(true);
    try { await cancelMeeting(meeting.id); onUpdate(); } catch (e) { console.error(e); } finally { setCancelling(false); }
  }

  async function handleGenerate() {
    if (!notes.trim()) return;
    setGenerating(true);
    try {
      const res = await generateMeetingNotes(meeting.id, notes, accountName);
      setAiNotes(res.generated_notes);
      setShowAi(true);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine() {
    if (!instruction.trim()) return;
    setRefining(true);
    try {
      const res = await generateMeetingNotes(meeting.id, aiNotes, accountName, instruction);
      setAiNotes(res.generated_notes);
      setInstruction("");
    } catch (e) {
      console.error(e);
    } finally {
      setRefining(false);
    }
  }

  function acceptAi() {
    setNotes(aiNotes);
    setShowAi(false);
    setAiNotes("");
  }

  async function handleSave() {
    if (!outcome) return;
    setSaving(true);
    try {
      await completeMeeting(meeting.id, outcome, notes);
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/accounts/${meeting.account_id}`}
            className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
          >
            {accountName}
          </Link>
          {meeting.accounts?.location && (
            <p className="text-xs text-gray-400">{meeting.accounts.location}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meeting.outcome && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${OUTCOME_COLORS[meeting.outcome] ?? "bg-gray-100 text-gray-500"}`}>
              {meeting.outcome}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colorClass}`}>
            {meeting.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Contact */}
      {meeting.contacts && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{meeting.contacts.name ?? "Contact"}</span>
          {meeting.contacts.title && <span className="text-gray-400"> · {meeting.contacts.title}</span>}
          {meeting.contacts.email && (
            <a href={`mailto:${meeting.contacts.email}`} className="text-blue-500 hover:underline ml-2 text-xs">
              {meeting.contacts.email}
            </a>
          )}
        </div>
      )}

      {/* Proposed times */}
      {meeting.proposed_times && meeting.proposed_times.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Proposed times</p>
          <ul className="flex flex-col gap-0.5">
            {meeting.proposed_times.map((t, i) => (
              <li key={i} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamps */}
      {meeting.confirmed_at && (
        <p className="text-xs text-green-600">Confirmed {new Date(meeting.confirmed_at).toLocaleDateString()}</p>
      )}
      {meeting.completed_at && (
        <p className="text-xs text-purple-600">Completed {new Date(meeting.completed_at).toLocaleDateString()}</p>
      )}

      {/* Meet link */}
      {meeting.calendar_link && (
        <div className="flex items-center gap-3">
          <a href={meeting.calendar_link} target="_blank" rel="noreferrer"
            className="text-xs text-blue-500 hover:underline font-medium">
            Join Google Meet →
          </a>
        </div>
      )}

      {/* Saved notes (completed) */}
      {isCompleted && meeting.notes && (
        <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-700 whitespace-pre-wrap border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Meeting Notes</p>
          {meeting.notes}
        </div>
      )}

      {/* Actionable: soft_interest / proposed */}
      {isActionable && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <Button size="sm" disabled={confirming || cancelling} onClick={handleConfirm}>
            {confirming ? "Confirming…" : "Confirm Meeting"}
          </Button>
          <Button size="sm" variant="ghost" disabled={confirming || cancelling} onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}

      {/* Confirmed: did meeting happen? */}
      {isConfirmed && step === "idle" && (
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500 mb-2">Did the meeting happen?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setStep("form")}
            >
              Meeting Happened
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? "Cancelling…" : "Didn't Happen"}
            </Button>
          </div>
        </div>
      )}

      {/* Post-meeting form */}
      {isConfirmed && step === "form" && (
        <div className="pt-2 border-t flex flex-col gap-4">

          {/* Outcome picker */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">What was the outcome?</p>
            <div className="flex gap-2">
              {(["won", "nurture", "lost"] as Outcome[]).map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all capitalize ${
                    outcome === o
                      ? o === "won"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : o === "nurture"
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500">Meeting notes</p>
              <button
                disabled={generating || !notes.trim()}
                onClick={handleGenerate}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <span className="text-base leading-none">✦</span>
                {generating ? "Generating…" : "Generate with AI"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="What was discussed? Key takeaways, objections raised, next steps agreed…"
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 placeholder:text-gray-300"
            />
          </div>

          {/* AI version */}
          {showAi && aiNotes && (
            <div className="border border-purple-200 bg-purple-50 rounded-md p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500">AI Version — edit before accepting</p>
                <button
                  onClick={() => { setShowAi(false); setAiNotes(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                rows={8}
                className="w-full text-xs text-gray-700 bg-white border border-purple-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              {/* Refine instruction */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                  placeholder="e.g. make it shorter, add next steps, more formal…"
                  className="flex-1 text-xs border border-purple-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white placeholder:text-gray-300"
                />
                <button
                  disabled={refining || !instruction.trim()}
                  onClick={handleRefine}
                  className="text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md whitespace-nowrap transition-colors"
                >
                  {refining ? "Updating…" : "Update with AI"}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={acceptAi}
                  className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  Use This Version
                </button>
                <button
                  onClick={() => { setShowAi(false); setAiNotes(""); }}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border hover:border-gray-400 transition-colors"
                >
                  Keep Mine
                </button>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!outcome || saving}
              className="bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40"
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save & Close"}
            </Button>
            <button
              onClick={() => setStep("idle")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
