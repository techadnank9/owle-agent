"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

type SentAction = {
  id: string;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  account_id: string;
  gmail_thread_id: string | null;
  accounts: { name: string; icp_score: number | null; location: string | null } | null;
  contacts: { email: string | null; name: string | null } | null;
};

export default function SentPage() {
  const [items, setItems] = useState<SentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("outreach_actions")
      .select("*, accounts(name, icp_score, location), contacts(email, name)")
      .eq("status", "sent")
      .eq("channel", "email");

    if (!data) { setLoading(false); return; }
    setItems(data as SentAction[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Sent</h1>
        <p className="text-sm text-gray-500">{items.length} email{items.length !== 1 ? "s" : ""} sent</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No emails sent yet.</p>
          <p className="text-xs mt-1">Send emails from the Ready to Send page.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.id} className="bg-white border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(e => e === item.id ? null : item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{item.accounts?.name ?? "Unknown"}</span>
                    {item.accounts?.icp_score != null && (
                      <Badge variant={item.accounts.icp_score >= 80 ? "default" : "secondary"} className="shrink-0">
                        ICP {Math.round(item.accounts.icp_score)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.subject}</p>
                </div>
                <span className="text-gray-300 text-xs shrink-0">{expanded === item.id ? "▲" : "▼"}</span>
              </button>

              {expanded === item.id && (
                <div className="px-4 pb-4 border-t pt-3 flex flex-col gap-3">
                  {item.contacts?.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Sent to:</span>
                      <a href={`mailto:${item.contacts.email}`} className="text-blue-600 hover:underline font-mono">{item.contacts.email}</a>
                    </div>
                  )}
                  {item.subject && (
                    <p className="text-sm font-medium text-gray-700">Subject: {item.subject}</p>
                  )}
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3 border">{item.body}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
