import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";

export default async function TutorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/(auth)/login");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Tutor Dashboard</h1>
      <p className="text-gray-500 mb-8">Manage your courses</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/(tutor)/courses" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">My Courses</h2>
          <p className="text-gray-500 text-sm">Create and manage your courses</p>
        </Link>
      </div>
    </div>
  );
}
