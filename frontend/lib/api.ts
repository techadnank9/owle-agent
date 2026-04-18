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

export async function sendOutreach(id: string) {
  const res = await fetch(`${API}/outreach/${id}/send`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type EmailEntry = {
  email: string;
  name?: string;
  location?: string;
  bed_count?: number;
};

export async function pasteAccounts(emails: EmailEntry[]) {
  const res = await fetch(`${API}/accounts/add-emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
