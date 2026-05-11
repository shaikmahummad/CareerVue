"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quiz",      label: "Skill Quiz" },
  { href: "/roadmap",   label: "My Roadmap" },
  { href: "/courses",   label: "Courses" },
  { href: "/profile",   label: "Profile" },
];

export default function StudentNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Highlight courses for sub-routes like /courses/[id]
  function isActive(href: string) {
    if (href === "/courses") return pathname.startsWith("/courses");
    return pathname === href;
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight flex-shrink-0">
            Career<span className="text-blue-600">Vue</span>
          </Link>
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isActive(href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
