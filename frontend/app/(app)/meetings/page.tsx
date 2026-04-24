"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MeetingCard } from "@/components/MeetingCard";

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

const STATUS_ORDER = ["confirmed", "soft_interest", "proposed", "completed", "cancelled"];

const STATUS_COLOR: Record<string, string> = {
  confirmed:     "bg-green-500",
  completed:     "bg-blue-500",
  soft_interest: "bg-yellow-400",
  proposed:      "bg-orange-400",
  cancelled:     "bg-gray-300",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed:     "Confirmed",
  completed:     "Completed",
  soft_interest: "Soft interest",
  proposed:      "Proposed",
  cancelled:     "Cancelled",
};

function meetingDate(m: Meeting): Date | null {
  const raw = m.confirmed_at ?? m.proposed_times?.[0] ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function CalendarView({ meetings, onSelectMeeting, selected }: {
  meetings: Meeting[];
  onSelectMeeting: (m: Meeting | null) => void;
  selected: Meeting | null;
}) {
  const today = new Date();
  const [current, setCurrent] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const meetingsWithDate = meetings.map(m => ({ m, date: meetingDate(m) })).filter(x => x.date !== null) as { m: Meeting; date: Date }[];

  function meetingsOnDay(day: Date) {
    return meetingsWithDate.filter(x => isSameDay(x.date, day)).map(x => x.m);
  }

  return (
    <div className="flex gap-4">
      {/* Calendar grid */}
      <div className="flex-1 bg-white border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 text-sm font-medium">‹ Prev</button>
          <p className="font-semibold text-gray-900">{MONTHS[month]} {year}</p>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 text-sm font-medium">Next ›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day ? isSameDay(day, today) : false;
            const isPast = day ? day < today && !isToday : false;
            const dayMeetings = day ? meetingsOnDay(day) : [];
            return (
              <div
                key={i}
                className={`min-h-[88px] p-1.5 border-b border-r last:border-r-0 ${
                  !day ? "bg-gray-50/50" : isPast ? "bg-gray-50/30" : "bg-white"
                } ${i % 7 === 6 ? "border-r-0" : ""}`}
              >
                {day && (
                  <>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                      isToday ? "bg-blue-600 text-white" : isPast ? "text-gray-400" : "text-gray-700"
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayMeetings.slice(0, 3).map(m => (
                        <button
                          key={m.id}
                          onClick={() => onSelectMeeting(selected?.id === m.id ? null : m)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate transition-opacity ${
                            STATUS_COLOR[m.status] ?? "bg-gray-400"
                          } text-white ${selected?.id === m.id ? "ring-2 ring-offset-1 ring-blue-400" : "hover:opacity-80"}`}
                        >
                          {m.accounts?.name ?? "Meeting"}
                        </button>
                      ))}
                      {dayMeetings.length > 3 && (
                        <p className="text-xs text-gray-400 px-1">+{dayMeetings.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-4 py-2.5 border-t bg-gray-50 flex items-center gap-4 flex-wrap">
          {Object.entries(STATUS_LABEL).filter(([k]) => k !== "cancelled").map(([k, label]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_COLOR[k]}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 shrink-0 bg-white border rounded-xl overflow-hidden self-start sticky top-0">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm truncate">{selected.accounts?.name}</p>
            <button onClick={() => onSelectMeeting(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[selected.status]}`} />
              <span className="text-xs font-medium text-gray-600">{STATUS_LABEL[selected.status]}</span>
            </div>
            {selected.contacts?.name && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                <p className="text-sm font-medium text-gray-800">{selected.contacts.name}</p>
                {selected.contacts.title && <p className="text-xs text-gray-500">{selected.contacts.title}</p>}
                {selected.contacts.email && <p className="text-xs text-blue-600">{selected.contacts.email}</p>}
              </div>
            )}
            {selected.accounts?.location && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Location</p>
                <p className="text-sm text-gray-700">{selected.accounts.location}</p>
              </div>
            )}
            {meetingDate(selected) && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Date & Time</p>
                <p className="text-sm font-medium text-gray-800">
                  {meetingDate(selected)!.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-xs text-gray-500">
                  {meetingDate(selected)!.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            )}
            {selected.proposed_times && selected.proposed_times.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Proposed times</p>
                <div className="flex flex-col gap-1">
                  {selected.proposed_times.map((t, i) => {
                    const d = new Date(t);
                    return (
                      <p key={i} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
            {selected.notes && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                <p className="text-xs text-gray-600 leading-relaxed">{selected.notes}</p>
              </div>
            )}
            {selected.calendar_link && (
              <a href={selected.calendar_link} target="_blank" rel="noreferrer"
                className="block text-center text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 transition-colors">
                Open in Google Calendar →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selected, setSelected] = useState<Meeting | null>(null);

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
    const initialLoad = setTimeout(() => { void load(); }, 0);
    const channel = supabase
      .channel("meetings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .subscribe();
    return () => { clearTimeout(initialLoad); supabase.removeChannel(channel); };
  }, [load]);

  const active = meetings.filter(m => m.status !== "cancelled");
  const confirmed = active.filter(m => m.status === "confirmed" || m.status === "completed");
  const pending = active.filter(m => m.status === "soft_interest" || m.status === "proposed");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500">{confirmed.length} confirmed · {pending.length} pending</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "calendar" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            List
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : meetings.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm text-gray-500">No meetings yet — meetings appear here when a prospect replies with interest.</p>
        </div>
      ) : view === "calendar" ? (
        <CalendarView meetings={meetings} onSelectMeeting={setSelected} selected={selected} />
      ) : (
        <div className="flex flex-col gap-4 max-w-2xl">
          {[...meetings]
            .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
            .map(m => <MeetingCard key={m.id} meeting={m} onUpdate={load} />)}
        </div>
      )}
    </div>
  );
}
