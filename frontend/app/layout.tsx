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
            <NavLink href="/search">Search SNFs</NavLink>
            <NavLink href="/queue">Approval Queue</NavLink>
            <NavLink href="/inbox">Reply Inbox</NavLink>
            <NavLink href="/how-it-works">How It Works</NavLink>
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
