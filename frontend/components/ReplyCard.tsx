import { Badge } from "@/components/ui/badge";

type Reply = {
  id: string;
  body: string;
  received_at: string;
  classification: string | null;
  confidence: number | null;
  response_draft: string | null;
  outreach_actions: {
    subject: string | null;
    accounts: { name: string } | null;
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

export function ReplyCard({ reply }: { reply: Reply }) {
  const cls = reply.classification;
  const colorClass = cls ? (classificationColor[cls] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-400";

  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">
            {reply.outreach_actions?.accounts?.name ?? "Unknown"}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(reply.received_at).toLocaleString()}
          </p>
        </div>
        {cls && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colorClass}`}>
            {cls.replace("_", " ")}
            {reply.confidence != null && ` · ${Math.round(reply.confidence * 100)}%`}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap border-l-2 border-gray-200 pl-3">
        {reply.body}
      </p>

      {reply.response_draft && (
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-400 mb-1">Suggested response</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.response_draft}</p>
        </div>
      )}
    </div>
  );
}
