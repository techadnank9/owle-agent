"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { approveOutreach, rejectOutreach, sendOutreach } from "@/lib/api";

const TEST_EMAIL = "clinic@agentmail.to";

type OutreachAction = {
  id: string;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  status: string;
  accounts: { name: string; icp_score: number | null; location: string | null } | null;
  contacts: { name: string | null; title: string | null; email: string | null; linkedin_url: string | null } | null;
};

export function OutreachCard({
  action,
  onUpdate,
  compact = false,
}: {
  action: OutreachAction;
  onUpdate: () => void;
  compact?: boolean;
}) {
  const [body, setBody] = useState(action.body);
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const contactEmail = action.contacts?.email ?? null;
  const emailOptions = [
    ...(contactEmail ? [contactEmail] : []),
    TEST_EMAIL,
  ];
  const [selectedEmail, setSelectedEmail] = useState(emailOptions[0] ?? "");

  async function handle(fn: () => Promise<unknown>, label: string) {
    setLoading(label);
    try { await fn(); onUpdate(); } finally { setLoading(null); }
  }

  const previewText = action.channel === "email"
    ? (action.subject || body.slice(0, 80))
    : body.slice(0, 100);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Badge variant="outline" className="text-xs shrink-0">{action.channel}</Badge>
        <span className="text-sm text-gray-700 flex-1 truncate">{previewText}</span>
        <span className="text-gray-300 text-xs shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t flex flex-col gap-3 pt-3">
          {/* Contact info */}
          {action.contacts && (action.contacts.name || action.contacts.title || action.contacts.email || action.contacts.linkedin_url) && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {action.contacts.name ? (
                    <span className="text-sm font-medium text-gray-900">{action.contacts.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Name not found</span>
                  )}
                  {action.contacts.title && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{action.contacts.title}</span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 flex-wrap items-center">
                  {action.channel === "email" && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-500 shrink-0">Send to:</span>
                      <select
                        value={selectedEmail}
                        onChange={e => setSelectedEmail(e.target.value)}
                        className="flex-1 min-w-0 text-xs border rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        onClick={e => e.stopPropagation()}
                      >
                        {emailOptions.map(e => (
                          <option key={e} value={e}>
                            {e === TEST_EMAIL ? `${e} (test)` : e}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {action.channel === "linkedin" && (
                    action.contacts.linkedin_url ? (
                      <a href={action.contacts.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                        {action.contacts.name ? `${action.contacts.name} on LinkedIn →` : "View LinkedIn →"}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No LinkedIn on file</span>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {action.subject && (
            <p className="text-sm font-medium text-gray-700">Subject: {action.subject}</p>
          )}

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={action.channel === "linkedin" ? 3 : 8}
            className="text-sm font-mono resize-none"
          />

          {action.channel === "linkedin" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(body); }}
              >
                Copy for LinkedIn
              </Button>
              <span className="text-xs text-gray-400">{body.length}/300 chars</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {action.channel === "email" && action.status === "approved" && (
              <Button
                size="sm"
                disabled={loading !== null}
                onClick={() => handle(() => sendOutreach(action.id, selectedEmail || TEST_EMAIL), "sending")}
              >
                {loading === "sending" ? "Sending…" : "Send Email"}
              </Button>
            )}
            {action.channel === "email" && action.status !== "approved" && (
              <>
                <Button
                  size="sm"
                  disabled={loading !== null}
                  onClick={() => handle(() => approveOutreach(action.id).then(() => sendOutreach(action.id, selectedEmail || TEST_EMAIL)), "sending")}
                >
                  {loading === "sending" ? "Sending…" : "Approve & Send"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading !== null}
                  onClick={() => handle(() => approveOutreach(action.id), "approving")}
                >
                  {loading === "approving" ? "…" : "Approve Only"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={loading !== null}
              onClick={() => handle(() => rejectOutreach(action.id), "rejecting")}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
