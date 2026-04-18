# Owle AI Revenue Agent — Plan 4: Frontend Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js dashboard with four views: account list, HITL approval queue, reply inbox, and account detail.

**Architecture:** Next.js 14 App Router. Supabase client for data fetching + Realtime subscriptions for live updates. shadcn/ui + Tailwind for UI. No auth for MVP — single-user tool. Backend API at `http://localhost:8000`.

**Tech Stack:** Next.js 14, TypeScript, shadcn/ui, Tailwind CSS, Supabase JS client, React Hook Form

---

## File Map

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout + nav sidebar
│   ├── page.tsx                 # Redirect to /accounts
│   ├── accounts/
│   │   └── page.tsx             # Account list with scores + upload CSV
│   ├── queue/
│   │   └── page.tsx             # HITL approval queue
│   ├── inbox/
│   │   └── page.tsx             # Reply inbox
│   └── accounts/[id]/
│       └── page.tsx             # Account detail + audit log
├── components/
│   ├── AccountCard.tsx          # Account row with ICP score badge
│   ├── OutreachCard.tsx         # Pending approval card with edit + approve
│   ├── ReplyCard.tsx            # Classified reply card
│   └── UploadButton.tsx         # CSV upload button
├── lib/
│   ├── supabase.ts              # Supabase browser client
│   └── api.ts                   # Backend API calls
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `frontend/` (all scaffold files)

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/adnan/Documents/owle-agent
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
cd frontend
```

- [ ] **Step 2: Install shadcn/ui**

```bash
cd frontend
npx shadcn@latest init -d
npx shadcn@latest add button badge card table textarea separator
```

- [ ] **Step 3: Install Supabase client**

```bash
cd frontend
npm install @supabase/supabase-js
```

- [ ] **Step 4: Create `.env.local`**

```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` — Next.js default page loads. Kill server.

- [ ] **Step 6: Commit**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/
git commit -m "feat: scaffold Next.js frontend"
```

---

## Task 2: Supabase client + API helpers

**Files:**
- Create: `frontend/lib/supabase.ts`
- Create: `frontend/lib/api.ts`

- [ ] **Step 1: Create `frontend/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

- [ ] **Step 2: Create `frontend/lib/api.ts`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/lib/
git commit -m "feat: Supabase client and API helpers"
```

---

## Task 3: Root layout + navigation

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Replace `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Owle AI — Revenue Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="flex h-screen">
          <aside className="w-56 bg-white border-r flex flex-col gap-1 p-4 shrink-0">
            <p className="text-sm font-semibold text-gray-900 mb-4">Owle AI</p>
            <NavLink href="/accounts">Accounts</NavLink>
            <NavLink href="/queue">Approval Queue</NavLink>
            <NavLink href="/inbox">Reply Inbox</NavLink>
          </aside>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded px-3 py-2 transition-colors"
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Replace `frontend/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/accounts");
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/app/layout.tsx frontend/app/page.tsx
git commit -m "feat: root layout with sidebar navigation"
```

---

## Task 4: Account list page + CSV upload

**Files:**
- Create: `frontend/components/UploadButton.tsx`
- Create: `frontend/components/AccountCard.tsx`
- Create: `frontend/app/accounts/page.tsx`

- [ ] **Step 1: Create `frontend/components/UploadButton.tsx`**

```tsx
"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadAccounts } from "@/lib/api";

export function UploadButton({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadAccounts(file);
      setResult(`Processed ${data.processed} account(s)`);
      onDone();
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button onClick={() => ref.current?.click()} disabled={loading}>
        {loading ? "Processing…" : "Upload CSV"}
      </Button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/components/AccountCard.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `frontend/app/accounts/page.tsx`**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AccountCard } from "@/components/AccountCard";
import { UploadButton } from "@/components/UploadButton";

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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .order("priority_score", { ascending: false, nullsFirst: false });
    setAccounts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("accounts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">{accounts.length} total</p>
        </div>
        <UploadButton onDone={load} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-400">No accounts yet — upload a CSV to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/components/ frontend/app/accounts/
git commit -m "feat: account list page with CSV upload and live updates"
```

---

## Task 5: HITL approval queue

**Files:**
- Create: `frontend/components/OutreachCard.tsx`
- Create: `frontend/app/queue/page.tsx`

- [ ] **Step 1: Create `frontend/components/OutreachCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `frontend/app/queue/page.tsx`**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { OutreachCard } from "@/components/OutreachCard";

type OutreachAction = {
  id: string;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  status: string;
  accounts: { name: string; icp_score: number | null; location: string | null } | null;
};

export default function QueuePage() {
  const [items, setItems] = useState<OutreachAction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("outreach_actions")
      .select("*, accounts(name, icp_score, location)")
      .eq("status", "pending_approval")
      .order("created_at");
    setItems((data ?? []) as OutreachAction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("queue-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_actions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Approval Queue</h1>
        <p className="text-sm text-gray-500">{items.length} pending</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Queue is empty — upload accounts to generate drafts.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => <OutreachCard key={item.id} action={item} onUpdate={load} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/components/OutreachCard.tsx frontend/app/queue/
git commit -m "feat: HITL approval queue with approve, send, reject"
```

---

## Task 6: Reply inbox

**Files:**
- Create: `frontend/components/ReplyCard.tsx`
- Create: `frontend/app/inbox/page.tsx`

- [ ] **Step 1: Create `frontend/components/ReplyCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `frontend/app/inbox/page.tsx`**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ReplyCard } from "@/components/ReplyCard";

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

export default function InboxPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("replies")
      .select("*, outreach_actions(subject, accounts(name))")
      .order("received_at", { ascending: false });
    setReplies((data ?? []) as Reply[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inbox-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Reply Inbox</h1>
        <p className="text-sm text-gray-500">{replies.length} replies</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : replies.length === 0 ? (
        <p className="text-sm text-gray-400">No replies yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {replies.map((r) => <ReplyCard key={r.id} reply={r} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/components/ReplyCard.tsx frontend/app/inbox/
git commit -m "feat: reply inbox with classification badges and response drafts"
```

---

## Task 7: Account detail page

**Files:**
- Create: `frontend/app/accounts/[id]/page.tsx`

- [ ] **Step 1: Create `frontend/app/accounts/[id]/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

type AuditEntry = {
  id: string;
  node: string;
  action: string;
  rationale: string;
  verified_facts: Record<string, unknown>;
  inferred_assumptions: Record<string, unknown>;
  created_at: string;
};

type Account = {
  id: string;
  name: string;
  type: string | null;
  bed_count: number | null;
  location: string | null;
  icp_score: number | null;
  priority_score: number | null;
  status: string;
  raw_data: Record<string, string>;
};

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    supabase.from("accounts").select("*").eq("id", id).single().then(({ data }) => setAccount(data));
    supabase
      .from("audit_log")
      .select("*")
      .eq("account_id", id)
      .order("created_at")
      .then(({ data }) => setAuditLog(data ?? []));
  }, [id]);

  if (!account) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{account.name}</h1>
            <p className="text-sm text-gray-500">{account.location} · {account.bed_count ? `${account.bed_count} beds` : "—"}</p>
          </div>
          <Badge variant="outline" className="capitalize">{account.status.replace("_", " ")}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-1">ICP Score</p>
            <p className="font-semibold text-gray-900">{account.icp_score != null ? Math.round(account.icp_score) : "—"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Priority Score</p>
            <p className="font-semibold text-gray-900">{account.priority_score != null ? Math.round(account.priority_score) : "—"}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Audit Log</h2>
        <div className="flex flex-col gap-2">
          {auditLog.length === 0 ? (
            <p className="text-sm text-gray-400">No audit entries yet.</p>
          ) : auditLog.map((entry) => (
            <div key={entry.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{entry.node}</span>
                <span className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-gray-700">{entry.action}</p>
              {entry.rationale && <p className="text-xs text-gray-400 mt-1">{entry.rationale}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit + push**

```bash
cd /Users/adnan/Documents/owle-agent
git add frontend/app/accounts/
git commit -m "feat: account detail page with scores and audit log"
git push origin main
```

---

## Task 8: Update README with frontend setup

- [ ] **Step 1: Add frontend section to README.md**

Open `README.md` and add under the backend Setup section:

```markdown
### 5. Frontend

```bash
cd frontend
cp .env.local.example .env.local  # fill in Supabase URL + key
npm install
npm run dev
```

Open `http://localhost:3000`

| Page | Path | What it does |
|---|---|---|
| Accounts | `/accounts` | Upload CSV, view scored accounts |
| Queue | `/queue` | Approve/reject/send outreach drafts |
| Inbox | `/inbox` | View classified replies + response drafts |
| Detail | `/accounts/:id` | Account scores + full audit log |
```

Also create `frontend/.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 2: Add frontend/.env.local to .gitignore**

Add to root `.gitignore`:
```
frontend/.env.local
```

- [ ] **Step 3: Commit + push**

```bash
cd /Users/adnan/Documents/owle-agent
git add README.md frontend/.env.local.example .gitignore
git commit -m "docs: add frontend setup to README"
git push origin main
```
