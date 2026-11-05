"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { apiGet, apiPut } from "../../lib/api";
import StudentNavbar from "../../components/StudentNavbar";
import TutorNavbar from "../../components/TutorNavbar";

interface Notice { id: string; title: string; body: string | null; is_read: boolean; link: string | null; created_at: string | null }

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([apiGet<{ role: string }>("/api/v1/auth/me"), apiGet<Notice[]>("/api/v1/notifications/")])
      .then(([profile, items]) => { setRole(profile.role); setNotices(items); })
      .finally(() => setLoading(false));
  }, []);
  async function markAllRead() {
    await apiPut("/api/v1/notifications/read-all");
    setNotices((items) => items.map((item) => ({ ...item, is_read: true })));
  }
  async function openNotice(notice: Notice) {
    if (!notice.is_read) {
      await apiPut(`/api/v1/notifications/${notice.id}/read`);
      setNotices((items) => items.map((item) => item.id === notice.id ? { ...item, is_read: true } : item));
    }
  }
  const Navbar = role === "tutor" ? TutorNavbar : StudentNavbar;
  return (
    <div className="min-h-screen bg-[#050508]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-white">Notifications</h1><p className="text-sm text-[#7c7a8a] mt-1">Course updates relevant to your account.</p></div>
          <button onClick={markAllRead} className="text-sm text-[#c4c0ff] flex items-center gap-2"><CheckCheck size={16} /> Mark all read</button>
        </div>
        {loading ? <Loader2 className="animate-spin text-[#6c63ff] mx-auto mt-20" /> : notices.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-[#7c7a8a]"><Bell className="mx-auto mb-3" /> No notifications yet.</div>
        ) : (
          <div className="space-y-3">{notices.map((notice) => (
            <Link key={notice.id} href={notice.link || "/notifications"} onClick={() => void openNotice(notice)} className={`block rounded-2xl border p-5 ${notice.is_read ? "bg-white/[0.03] border-white/[0.06]" : "bg-[#6c63ff]/10 border-[#6c63ff]/30"}`}>
              <div className="flex items-start gap-3"><Bell size={17} className="text-[#c4c0ff] mt-0.5" /><div><p className="font-semibold text-[#e6e0e9]">{notice.title}</p>{notice.body && <p className="text-sm text-[#a9a4b2] mt-1">{notice.body}</p>}{notice.created_at && <p className="text-xs text-[#7c7a8a] mt-2">{new Date(notice.created_at).toLocaleString()}</p>}</div></div>
            </Link>
          ))}</div>
        )}
      </main>
    </div>
  );
}
