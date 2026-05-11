"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/courses",   label: "Courses" },
  { href: "/admin/users",     label: "Users" },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="bg-gray-900 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="text-lg font-bold tracking-tight flex-shrink-0 text-white">
            Career<span className="text-blue-400">Vue</span>
            <span className="ml-2 text-xs font-medium text-gray-300 bg-gray-700 px-2 py-0.5 rounded-full">Admin</span>
          </Link>
          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  pathname.startsWith(href)
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800 flex-shrink-0"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
