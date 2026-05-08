import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/(auth)/login");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome back, {user.user_metadata?.full_name ?? "student"}!</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/(student)/quiz" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Skill Quiz</h2>
          <p className="text-gray-500 text-sm">Take your personalized skill assessment</p>
        </Link>
        <Link href="/(student)/roadmap" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">My Roadmap</h2>
          <p className="text-gray-500 text-sm">View your personalized learning path</p>
        </Link>
        <Link href="/(student)/courses" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Browse Courses</h2>
          <p className="text-gray-500 text-sm">Explore available courses</p>
        </Link>
      </div>
    </div>
  );
}
