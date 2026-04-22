"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmMeeting, cancelMeeting } from "@/lib/api";
import Link from "next/link";

type Meeting = {
  id: string;
  account_id: string;
  contact_id: string | null;
  status: string;
  proposed_times: string[] | null;
  confirmed_at: string | null;
  calendar_link: string | null;
  created_at: string;
  accounts: { name: string; location: string | null } | null;
  contacts: { name: string | null; title: string | null; email: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  soft_interest: "bg-yellow-100 text-yellow-700",
  proposed: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function MeetingCard({ meeting, onUpdate }: { meeting: Meeting; onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(fn: () => Promise<unknown>, label: string) {
    setLoading(label);
    try { await fn(); onUpdate(); } catch (e) { console.error(e); } finally { setLoading(null); }
  }

  const colorClass = STATUS_COLORS[meeting.status] ?? "bg-gray-100 text-gray-500";
  const isActionable = meeting.status === "soft_interest" || meeting.status === "proposed";

  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/accounts/${meeting.account_id}`}
            className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
          >
            {meeting.accounts?.name ?? "Unknown"}
          </Link>
          {meeting.accounts?.location && (
            <p className="text-xs text-gray-400">{meeting.accounts.location}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize shrink-0 ${colorClass}`}>
          {meeting.status.replace("_", " ")}
        </span>
      </div>

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

      {meeting.confirmed_at && (
        <p className="text-xs text-green-600">
          Confirmed {new Date(meeting.confirmed_at).toLocaleDateString()}
        </p>
      )}

      {meeting.calendar_link && (
        <a href={meeting.calendar_link} target="_blank" rel="noreferrer"
          className="text-xs text-blue-500 hover:underline">
          Open calendar event →
        </a>
      )}

      <p className="text-xs text-gray-300">
        Created {new Date(meeting.created_at).toLocaleString()}
      </p>

      {isActionable && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <Button
            size="sm"
            disabled={loading !== null}
            onClick={() => handle(() => confirmMeeting(meeting.id), "confirming")}
          >
            {loading === "confirming" ? "Confirming…" : "Confirm Meeting"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={loading !== null}
            onClick={() => handle(() => cancelMeeting(meeting.id), "cancelling")}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
