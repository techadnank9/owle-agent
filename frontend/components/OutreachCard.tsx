"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { approveOutreach, rejectOutreach, sendOutreach } from "@/lib/api";

type OutreachAction = {
  id: string;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  status: string;
  accounts: { name: string; icp_score: number | null; location: string | null } | null;
};

export function OutreachCard({ action, onUpdate }: { action: OutreachAction; onUpdate: () => void }) {
  const [body, setBody] = useState(action.body);
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(fn: () => Promise<unknown>, label: string) {
    setLoading(label);
    try { await fn(); onUpdate(); } finally { setLoading(null); }
  }

  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{action.accounts?.name ?? "Unknown"}</p>
          <p className="text-sm text-gray-400">{action.accounts?.location ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">{action.channel}</Badge>
          {action.accounts?.icp_score != null && (
            <Badge variant={action.accounts.icp_score >= 75 ? "default" : "secondary"}>
              ICP {Math.round(action.accounts.icp_score)}
            </Badge>
          )}
        </div>
      </div>

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
        {action.channel === "email" && (
          <Button
            size="sm"
            disabled={loading !== null}
            onClick={() => handle(() => approveOutreach(action.id).then(() => sendOutreach(action.id)), "sending")}
          >
            {loading === "sending" ? "Sending…" : "Approve & Send"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => handle(() => approveOutreach(action.id), "approving")}
        >
          {loading === "approving" ? "…" : "Approve Only"}
        </Button>
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
  );
}
