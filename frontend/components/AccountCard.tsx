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
  raw_data?: {
    phone?: string;
    website?: string;
    address?: string;
    category?: string;
    rating?: number;
    reviews_count?: number;
  } | null;
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
    customer: "text-emerald-600",
    churned: "text-red-500",
    nurture: "text-orange-500",
  };
  return map[status] ?? "text-gray-400";
}

export function AccountCard({ account }: { account: Account }) {
  const raw = account.raw_data;
  const meta: string[] = [];
  if (account.bed_count) meta.push(`${account.bed_count} beds`);
  if (account.location) meta.push(account.location);
  if (raw?.category && raw.category !== "Skilled nursing care facility") meta.push(raw.category);

  return (
    <Link href={`/accounts/${account.id}`}>
      <div className="flex items-start gap-4 p-4 bg-white rounded-lg border hover:border-gray-300 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900 truncate">{account.name}</p>
            {raw?.rating && (
              <span className="text-xs text-gray-400">★ {raw.rating}{raw.reviews_count ? ` (${raw.reviews_count})` : ""}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta.length > 0 ? meta.join(" · ") : "—"}
          </p>
          <div className="flex gap-3 mt-1 flex-wrap">
            {raw?.address && (
              <span className="text-xs text-gray-400">{raw.address}</span>
            )}
            {raw?.phone && (
              <span className="text-xs text-gray-400">{raw.phone}</span>
            )}
            {raw?.website && (
              <span
                className="text-xs text-blue-400 truncate max-w-xs"
                onClick={e => { e.preventDefault(); window.open(raw.website, "_blank"); }}
              >
                {raw.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
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
