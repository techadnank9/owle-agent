"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type DealAccount = {
  id: string;
  name: string;
  location: string | null;
  status: string;
  meetings: {
    id: string;
    outcome: string | null;
    notes: string | null;
    completed_at: string | null;
    confirmed_at: string | null;
    proposed_times: string[] | null;
  }[];
};

const COLUMNS: { key: string; label: string; statuses: string[]; bg: string; border: string; dot: string; empty: string }[] = [
  {
    key: "meeting_booked",
    label: "Meeting Booked",
    statuses: ["meeting_booked"],
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    empty: "No confirmed meetings pending outcome.",
  },
  {
    key: "won",
    label: "Won",
    statuses: ["customer"],
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    empty: "No won deals yet.",
  },
  {
    key: "nurture",
    label: "Nurturing",
    statuses: ["nurture"],
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-400",
    empty: "No accounts in nurture.",
  },
  {
    key: "lost",
    label: "Lost",
    statuses: ["churned"],
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
    empty: "No lost deals.",
  },
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function DealCard({ account }: { account: DealAccount }) {
  const meeting = account.meetings?.[0] ?? null;
  const meetingTime = meeting?.completed_at ?? meeting?.confirmed_at ?? null;
  const proposedTime = meeting?.proposed_times?.[0] ?? null;

  return (
    <div className="bg-white border rounded-lg p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/accounts/${account.id}`}
          className="font-medium text-sm text-gray-900 hover:text-blue-600 hover:underline leading-tight"
        >
          {account.name}
        </Link>
        {meetingTime && (
          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(meetingTime)}</span>
        )}
      </div>

      {account.location && (
        <p className="text-xs text-gray-400">{account.location}</p>
      )}

      {proposedTime && (
        <p className="text-xs text-gray-500">
          <span className="text-gray-400">Meeting: </span>{proposedTime}
        </p>
      )}

      {meeting?.notes && (
        <p className="text-xs text-gray-600 line-clamp-3 border-l-2 border-gray-200 pl-2">
          {meeting.notes}
        </p>
      )}

      {!meeting?.notes && account.status === "meeting_booked" && (
        <p className="text-xs text-gray-300 italic">Notes not yet added</p>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const [accounts, setAccounts] = useState<DealAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select(`
        id, name, location, status,
        meetings(id, outcome, notes, completed_at, confirmed_at, proposed_times)
      `)
      .in("status", ["meeting_booked", "customer", "churned", "nurture"])
      .order("name");

    setAccounts((data ?? []) as DealAccount[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = accounts.length;
  const won = accounts.filter(a => a.status === "customer").length;
  const lost = accounts.filter(a => a.status === "churned").length;
  const nurture = accounts.filter(a => a.status === "nurture").length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
          <p className="text-sm text-gray-500">
            {total} clinics post-meeting · {won} won · {nurture} nurturing · {lost} lost
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-4 gap-4 items-start">
          {COLUMNS.map(col => {
            const items = accounts.filter(a => col.statuses.includes(a.status));
            return (
              <div key={col.key} className={`rounded-xl border ${col.border} ${col.bg} p-3 flex flex-col gap-3`}>
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-2 py-0.5 border">
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 px-2">{col.empty}</p>
                ) : (
                  items.map(a => <DealCard key={a.id} account={a} />)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
