const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function uploadAccounts(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/accounts/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function approveOutreach(id: string) {
  const res = await fetch(`${API}/outreach/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function rejectOutreach(id: string) {
  const res = await fetch(`${API}/outreach/${id}/reject`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendOutreach(id: string, toEmail: string) {
  const res = await fetch(`${API}/outreach/${id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_email: toEmail }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type EmailEntry = {
  email: string;
  name?: string;
  location?: string;
  bed_count?: number;
};

export async function searchSnfs(params: {
  query: string;
  state: string;
  city?: string;
  max_results?: number;
}) {
  const qs = new URLSearchParams({
    query: params.query,
    state: params.state,
    ...(params.city ? { city: params.city } : {}),
    ...(params.max_results ? { max_results: String(params.max_results) } : {}),
  });
  const res = await fetch(`${API}/accounts/search?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type FacilityResult = {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  rating: number | null;
  reviews_count: number;
  place_id: string;
  maps_url: string;
  category: string;
};

export async function enrichAccount(id: string) {
  const res = await fetch(`${API}/accounts/${id}/enrich`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bulkImport(facilities: FacilityResult[]) {
  const res = await fetch(`${API}/accounts/bulk-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facilities }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bookMeeting(
  accountId: string,
  proposedTime: string,
): Promise<{ status: string; proposed_time: string; meet_link: string | null; outreach_action_id: string | null }> {
  const res = await fetch(`${API}/meetings/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: accountId, proposed_time: proposedTime }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function confirmMeeting(id: string) {
  const res = await fetch(`${API}/meetings/${id}/confirm`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cancelMeeting(id: string) {
  const res = await fetch(`${API}/meetings/${id}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendReplyResponse(replyId: string) {
  const res = await fetch(`${API}/webhooks/replies/${replyId}/send-response`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function reprocessReply(replyId: string) {
  const res = await fetch(`${API}/webhooks/reprocess/${replyId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function pasteAccounts(emails: EmailEntry[]) {
  const res = await fetch(`${API}/accounts/add-emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
