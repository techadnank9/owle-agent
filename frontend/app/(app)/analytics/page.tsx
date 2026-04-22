"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type OutreachRow = {
  id: string;
  channel: string;
  status: string;
};

type ReplyRow = {
  id: string;
  classification: string | null;
  outreach_action_id: string | null;
  outreach_actions: { channel: string; account_id: string } | { channel: string; account_id: string }[] | null;
};

type MeetingRow = {
  id: string;
  status: string;
};

type OutcomeRow = {
  id: string;
  message_angle: string | null;
  channel: string | null;
  reply_received: boolean;
  meeting_booked: boolean;
};

type Stats = {
  sent: number;
  replies: number;
  interested: number;
  meetings: number;
  byChannel: Record<string, { sent: number; replies: number; interested: number }>;
  byClassification: Record<string, number>;
  byAngle: Record<string, { replies: number; meetings: number }>;
};

function pct(num: number, den: number) {
  if (!den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [outreachRes, repliesRes, meetingsRes, signalsRes] = await Promise.all([
      supabase.from("outreach_actions").select("id, channel, status").eq("status", "sent"),
      supabase.from("replies").select("id, classification, outreach_action_id, outreach_actions(channel, account_id)"),
      supabase.from("meetings").select("id, status"),
      supabase.from("outcome_signals").select("id, message_angle, channel, reply_received, meeting_booked"),
    ]);

    const outreach: OutreachRow[] = (outreachRes.data ?? []) as OutreachRow[];
    const replies: ReplyRow[] = (repliesRes.data ?? []) as ReplyRow[];
    const meetings: MeetingRow[] = (meetingsRes.data ?? []) as MeetingRow[];
    const signals: OutcomeRow[] = (signalsRes.data ?? []) as OutcomeRow[];

    const byChannel: Record<string, { sent: number; replies: number; interested: number }> = {};
    for (const o of outreach) {
      const ch = o.channel ?? "unknown";
      byChannel[ch] ??= { sent: 0, replies: 0, interested: 0 };
      byChannel[ch].sent++;
    }
    const seenReplyAccounts: Record<string, Set<string>> = {};
    for (const r of replies) {
      const oa = r.outreach_actions;
      const ch = (Array.isArray(oa) ? oa[0]?.channel : oa?.channel) ?? "unknown";
      const acct = (Array.isArray(oa) ? oa[0]?.account_id : oa?.account_id) ?? r.id;
      byChannel[ch] ??= { sent: 0, replies: 0, interested: 0 };
      seenReplyAccounts[ch] ??= new Set();
      if (!seenReplyAccounts[ch].has(acct)) {
        seenReplyAccounts[ch].add(acct);
        byChannel[ch].replies++;
        if (r.classification === "interested") byChannel[ch].interested++;
      }
    }

    const byClassification: Record<string, number> = {};
    const seenClsAccounts: Record<string, Set<string>> = {};
    for (const r of replies) {
      const cls = r.classification ?? "unclassified";
      const oa = r.outreach_actions;
      const acct = (Array.isArray(oa) ? oa[0]?.account_id : oa?.account_id) ?? r.id;
      seenClsAccounts[cls] ??= new Set();
      if (!seenClsAccounts[cls].has(acct)) {
        seenClsAccounts[cls].add(acct);
        byClassification[cls] = (byClassification[cls] ?? 0) + 1;
      }
    }

    const byAngle: Record<string, { replies: number; meetings: number }> = {};
    for (const s of signals) {
      const angle = s.message_angle ?? "unknown";
      byAngle[angle] ??= { replies: 0, meetings: 0 };
      if (s.reply_received) byAngle[angle].replies++;
      if (s.meeting_booked) byAngle[angle].meetings++;
    }

    // Deduplicate replies by account for rate calculations
    const repliedAccounts = new Set(replies.map(r => {
      const oa = r.outreach_actions;
      return Array.isArray(oa) ? oa[0]?.account_id : oa?.account_id;
    }).filter(Boolean));

    setStats({
      sent: outreach.length,
      replies: repliedAccounts.size,
      interested: new Set(replies.filter(r => r.classification === "interested").map(r => {
        const oa = r.outreach_actions;
        return Array.isArray(oa) ? oa[0]?.account_id : oa?.account_id;
      }).filter(Boolean)).size,
      meetings: meetings.filter(m => m.status === "confirmed").length,
      byChannel,
      byClassification,
      byAngle,
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const CLS_COLORS: Record<string, string> = {
    interested: "text-green-700 bg-green-50",
    not_now: "text-yellow-700 bg-yellow-50",
    referral: "text-blue-700 bg-blue-50",
    not_a_fit: "text-red-700 bg-red-50",
    unsubscribe: "text-gray-600 bg-gray-50",
    unclear: "text-orange-700 bg-orange-50",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">What&apos;s working across channels and message angles</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !stats ? (
        <p className="text-sm text-gray-400">No data yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Emails sent", value: stats.sent },
              { label: "Replies", value: `${stats.replies} (${pct(stats.replies, stats.sent)})` },
              { label: "Interested", value: `${stats.interested} (${pct(stats.interested, stats.sent)})` },
              { label: "Meetings confirmed", value: stats.meetings },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-lg p-4">
                <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* By channel */}
          {Object.keys(stats.byChannel).length > 0 && (
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">By channel</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b">
                    <th className="text-left pb-2">Channel</th>
                    <th className="text-right pb-2">Sent</th>
                    <th className="text-right pb-2">Replies</th>
                    <th className="text-right pb-2">Reply rate</th>
                    <th className="text-right pb-2">Interested</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.byChannel).map(([ch, d]) => (
                    <tr key={ch} className="border-b last:border-0">
                      <td className="py-2 capitalize">{ch}</td>
                      <td className="py-2 text-right text-gray-600">{d.sent}</td>
                      <td className="py-2 text-right text-gray-600">{d.replies}</td>
                      <td className="py-2 text-right text-gray-600">{pct(d.replies, d.sent)}</td>
                      <td className="py-2 text-right text-gray-600">{d.interested}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reply classification breakdown */}
          {Object.keys(stats.byClassification).length > 0 && (
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Reply breakdown</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byClassification)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cls, count]) => (
                    <span
                      key={cls}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full capitalize ${CLS_COLORS[cls] ?? "text-gray-600 bg-gray-50"}`}
                    >
                      {cls.replace("_", " ")} · {count}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* By message angle */}
          {Object.keys(stats.byAngle).length > 0 && (
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">By message angle</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b">
                    <th className="text-left pb-2">Angle</th>
                    <th className="text-right pb-2">Replies</th>
                    <th className="text-right pb-2">Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.byAngle)
                    .sort((a, b) => b[1].replies - a[1].replies)
                    .map(([angle, d]) => (
                      <tr key={angle} className="border-b last:border-0">
                        <td className="py-2 capitalize">{angle}</td>
                        <td className="py-2 text-right text-gray-600">{d.replies}</td>
                        <td className="py-2 text-right text-gray-600">{d.meetings}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(stats.byChannel).length === 0 && Object.keys(stats.byAngle).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No data yet — analytics populate as emails are sent and replies come in.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
