"use client";
import { Inter } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className={`${inter.className} bg-gray-50 min-h-screen flex h-screen`}>
      <aside className="w-56 bg-white border-r flex flex-col gap-1 p-4 shrink-0">
        <p className="text-sm font-semibold text-gray-900 mb-4">Owle AI</p>
        <NavLink href="/accounts">Accounts</NavLink>
        <NavLink href="/search">Search SNFs</NavLink>
        <NavLink href="/queue">Approval Queue</NavLink>
        <NavLink href="/ready">Ready to Send</NavLink>
        <NavLink href="/sent">Sent</NavLink>
        <NavLink href="/inbox">Reply Inbox</NavLink>
        <NavLink href="/meetings">Meetings</NavLink>
        <NavLink href="/analytics">Analytics</NavLink>
        <NavLink href="/how-it-works">How It Works</NavLink>
        <div className="mt-auto pt-4 border-t">
          <button
            onClick={handleSignOut}
            className="w-full text-left text-xs text-gray-400 hover:text-gray-600 px-3 py-2 rounded hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
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
