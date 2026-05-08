import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/(auth)/login");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
      <p className="text-gray-500 mb-8">Platform management</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Pending Approvals</h2>
          <p className="text-gray-500 text-sm">Review courses awaiting approval</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Manage Users</h2>
          <p className="text-gray-500 text-sm">View and manage platform users</p>
        </div>
      </div>
    </div>
  );
}
