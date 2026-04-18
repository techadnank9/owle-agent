import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Account = {
  id: string;
  name: string;
  type: string | null;
  bed_count: number | null;
  location: string | null;
  icp_score: number | null;
  priority_score: number | null;
  status: string;
};

function scoreBadge(score: number | null) {
  if (score === null) return <Badge variant="outline">Unscored</Badge>;
  const variant = score >= 75 ? "default" : score >= 50 ? "secondary" : "outline";
  return <Badge variant={variant}>{Math.round(score)}</Badge>;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "text-gray-400",
    in_outreach: "text-blue-600",
    replied: "text-yellow-600",
    meeting_booked: "text-green-600",
    paused: "text-orange-500",
    excluded: "text-red-400",
  };
  return map[status] ?? "text-gray-400";
}

export function AccountCard({ account }: { account: Account }) {
  return (
    <Link href={`/accounts/${account.id}`}>
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:border-gray-300 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{account.name}</p>
          <p className="text-sm text-gray-500">
            {account.bed_count ? `${account.bed_count} beds` : "—"} · {account.location ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400">ICP</p>
            {scoreBadge(account.icp_score)}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Priority</p>
            {scoreBadge(account.priority_score)}
          </div>
          <span className={`text-xs font-medium capitalize ${statusColor(account.status)}`}>
            {account.status.replace("_", " ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
