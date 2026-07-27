import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Users, DollarSign, ClipboardList, CheckSquare, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { adminApi, ApiError } from "@/lib/api";

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof adminApi.dashboardSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .dashboardSummary()
      .then(setSummary)
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  const stats = summary
    ? [
        { label: "Total Users", value: summary.totalUsers.toLocaleString(), icon: Users, color: "bg-blue-50 text-blue-600", link: "/admin/users" },
        { label: "Platform Revenue", value: `₦${summary.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-green-50 text-green-600", link: "/admin/payments" },
        { label: "Pending Approvals", value: String(summary.pendingApprovalsCount), icon: CheckSquare, color: "bg-amber-50 text-amber-600", link: "/admin/approvals" },
        { label: "Active Bookings", value: String(summary.activeBookingsCount), icon: ClipboardList, color: "bg-purple-50 text-purple-600", link: "/admin/bookings" },
      ]
    : [];

  const maxCategoryRevenue = summary?.topCategories[0]?.revenue || 1;

  return (
    <DashboardLayout role="admin" title="Admin Dashboard">
      {errorMessage && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      ) : (
        <>
          {/* Stats — each card links to the page it summarizes */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Link key={stat.label} to={stat.link} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all block">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Top Categories — real, from paid bookings */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Service Categories</h3>
                {!summary || summary.topCategories.length === 0 ? (
                  <p className="text-sm text-slate-400">No paid bookings yet — this fills in once real transactions happen.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.topCategories.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-500 w-6">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                            <span className="text-sm text-slate-500">{cat.bookings} bookings</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-teal-500 to-orange-500 rounded-full" style={{ width: `${(cat.revenue / maxCategoryRevenue) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-teal-600 w-24 text-right">₦{(cat.revenue / 1000).toFixed(0)}K</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* User Distribution — real counts */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">User Distribution</h3>
                <div className="space-y-2">
                  <Link to="/admin/users" className="flex items-center justify-between text-sm hover:text-teal-600">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500" />Customers</span>
                    <span className="font-medium">{summary?.totalCustomers ?? 0}</span>
                  </Link>
                  <Link to="/admin/users" className="flex items-center justify-between text-sm hover:text-teal-600">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" />Providers</span>
                    <span className="font-medium">{summary?.totalProviders ?? 0}</span>
                  </Link>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" />Admins</span>
                    <span className="font-medium">{summary?.totalAdmins ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity — real, merged from applications/payments/bookings */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
                {!summary || summary.recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {summary.recentActivity.map((activity, i) => (
                      <Link key={i} to={activity.link} className="flex items-start gap-3 group">
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm text-slate-700 group-hover:text-teal-600">{activity.text}</p>
                          <p className="text-xs text-slate-400">{new Date(activity.date).toLocaleString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link to="/admin/approvals" className="flex items-center justify-between bg-gradient-to-r from-teal-500 to-orange-500 rounded-2xl p-4 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Review pending approvals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
