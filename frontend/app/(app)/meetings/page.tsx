"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MeetingCard } from "@/components/MeetingCard";

type Meeting = {
  id: string;
  account_id: string;
  contact_id: string | null;
  status: string;
  proposed_times: string[] | null;
  confirmed_at: string | null;
  calendar_link: string | null;
  accounts: { name: string; location: string | null } | null;
  contacts: { name: string | null; title: string | null; email: string | null } | null;
};

const STATUS_ORDER = ["soft_interest", "proposed", "confirmed", "cancelled"];

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meetings")
      .select("*, accounts(name, location), contacts(name, title, email)")
      .order("confirmed_at", { ascending: false });
    setMeetings((data ?? []) as Meeting[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void load();
    }, 0);
    const channel = supabase
      .channel("meetings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .subscribe();
    return () => {
      clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const active = meetings.filter(m => m.status !== "cancelled");
  const confirmed = active.filter(m => m.status === "confirmed");
  const pending = active.filter(m => m.status !== "confirmed");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500">
            {confirmed.length} confirmed · {pending.length} pending
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-gray-400">No meetings yet — meetings appear here when a prospect replies with interest.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...meetings].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
            .map(m => <MeetingCard key={m.id} meeting={m} onUpdate={load} />)}
        </div>
      )}
    </div>
  );
}
