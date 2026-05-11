"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Users, GraduationCap, BookOpen, Shield,
  ChevronDown, Loader2, AlertTriangle, Check,
} from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet, apiPut, apiDelete } from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  student:     { label: "Student",     color: "text-blue-700 bg-blue-50",    icon: GraduationCap },
  tutor:       { label: "Tutor",       color: "text-violet-700 bg-violet-50", icon: BookOpen },
  admin:       { label: "Admin",       color: "text-emerald-700 bg-emerald-50", icon: Shield },
  deactivated: { label: "Deactivated", color: "text-gray-500 bg-gray-100",    icon: Users },
};

const ROLE_FILTERS = ["all", "student", "tutor", "admin", "deactivated"] as const;
type RoleFilter = typeof ROLE_FILTERS[number];
const FILTER_LABELS: Record<RoleFilter, string> = {
  all: "All", student: "Students", tutor: "Tutors",
  admin: "Admins", deactivated: "Deactivated",
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const bg =
    role === "admin"       ? "from-emerald-500 to-teal-600" :
    role === "tutor"       ? "from-violet-500 to-indigo-600" :
    role === "deactivated" ? "from-gray-300 to-gray-400" :
                             "from-blue-500 to-sky-600";

  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials || "?"}
    </div>
  );
}

// ─── Role dropdown ────────────────────────────────────────────────────────────

function RoleDropdown({
  userId,
  currentRole,
  onChanged,
}: {
  userId: string;
  currentRole: string;
  onChanged: (id: string, newRole: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const ROLES = ["student", "tutor", "admin"];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function changeRole(role: string) {
    if (role === currentRole) { setOpen(false); return; }
    setOpen(false);
    setLoading(true);
    try {
      await apiPut(`/api/v1/admin/users/${userId}/role`, { role });
      onChanged(userId, role);
    } catch (e: any) {
      alert(e.message ?? "Failed to change role");
    } finally {
      setLoading(false);
    }
  }

  const cfg = ROLE_CONFIG[currentRole] ?? ROLE_CONFIG.student;
  const Icon = cfg.icon;

  if (currentRole === "deactivated") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
        <Icon size={11} /> {cfg.label}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors hover:opacity-80 ${cfg.color}`}
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
        {cfg.label}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[130px]"
          >
            {ROLES.map((role) => {
              const rcfg = ROLE_CONFIG[role];
              const RIcon = rcfg.icon;
              return (
                <button
                  key={role}
                  onClick={() => changeRole(role)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RIcon size={12} className="text-gray-400" />
                  <span className="flex-1 text-left">{rcfg.label}</span>
                  {role === currentRole && <Check size={11} className="text-blue-500" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onRoleChange,
  onDeactivate,
}: {
  user: User;
  onRoleChange: (id: string, newRole: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const [deactivating, setDeactivating] = useState(false);

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${user.full_name}? They will no longer be able to log in.`)) return;
    setDeactivating(true);
    try {
      await apiDelete(`/api/v1/admin/users/${user.id}`);
      onDeactivate(user.id);
    } catch (e: any) {
      alert(e.message ?? "Failed to deactivate user");
    } finally {
      setDeactivating(false);
    }
  }

  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: user.role === "deactivated" ? 0.6 : 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-gray-50 last:border-0"
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} role={user.role} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <RoleDropdown userId={user.id} currentRole={user.role} onChanged={onRoleChange} />
      </td>
      <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">{joinDate}</td>
      <td className="py-3 px-4 text-right">
        {user.role !== "deactivated" && (
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
          >
            {deactivating ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            Deactivate
          </button>
        )}
      </td>
    </motion.tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchUsers(role: RoleFilter, q: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (q.trim()) params.set("search", q.trim());
    apiGet<User[]>(`/api/v1/admin/users?${params}`)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchUsers(filter, search); }, [filter]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchUsers(filter, val), 350);
  }

  function handleRoleChange(id: string, newRole: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: newRole } : u));
  }

  function handleDeactivate(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: "deactivated" } : u));
  }

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""} found</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {ROLE_FILTERS.map((f) => {
            const count = f === "all" ? users.length : (roleCounts[f] ?? 0);
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  filter === f
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {FILTER_LABELS[f]} ({count})
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={26} className="animate-spin text-blue-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <Users size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No users found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onRoleChange={handleRoleChange}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
