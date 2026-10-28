import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ClipboardList,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  ArrowRight,
  Star,
  TrendingUp,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { bookingApi, serviceApi, chatApi, notificationApi, type BookingItem, type ServiceItem, type NotificationItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const quickActions = [
  { label: "Find Service", icon: TrendingUp, path: "/dashboard/services", color: "from-teal-500 to-teal-600" },
  { label: "My Bookings", icon: ClipboardList, path: "/dashboard/bookings", color: "from-blue-500 to-blue-600" },
  { label: "Write Post", icon: Star, path: "/dashboard/blog", color: "from-orange-500 to-orange-600" },
  { label: "Chat", icon: MessageSquare, path: "/dashboard/chat", color: "from-purple-500 to-purple-600" },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [recommended, setRecommended] = useState<ServiceItem[]>([]);
  const [unreadChats, setUnreadChats] = useState(0);
  const [activity, setActivity] = useState<NotificationItem[]>([]);

  useEffect(() => {
    bookingApi.mine().then((res) => setBookings(res.bookings)).catch(() => setBookings([]));
    serviceApi.list().then((res) => setRecommended(res.services.slice(0, 3))).catch(() => setRecommended([]));
    chatApi.rooms().then((res) => setUnreadChats(res.rooms.reduce((sum, r) => sum + r.unreadCount, 0))).catch(() => setUnreadChats(0));
    notificationApi.mine().then((res) => setActivity(res.notifications.slice(0, 3))).catch(() => setActivity([]));
  }, []);

  const activeCount = bookings.filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.price, 0);

  const stats = [
    { label: "Active Bookings", value: String(activeCount), icon: ClipboardList, color: "bg-blue-50 text-blue-600" },
    { label: "Completed", value: String(completedCount), icon: CheckCircle2, color: "bg-green-50 text-green-600" },
    { label: "Total Spent", value: `₦${totalSpent.toLocaleString()}`, icon: DollarSign, color: "bg-amber-50 text-amber-600" },
    { label: "Unread Messages", value: String(unreadChats), icon: MessageSquare, color: "bg-purple-50 text-purple-600" },
  ];

  const recentBookings = bookings.slice(0, 4);
  const trialRemaining = user?.trialBookingsRemaining ?? 0;

  return (
    <DashboardLayout role="customer" title="Dashboard">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.path}>
                  <div className={`bg-gradient-to-br ${action.color} rounded-xl p-4 text-white text-center hover:shadow-lg transition-all hover:-translate-y-0.5`}>
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-2">
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium">{action.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Recent Bookings</h3>
              <Link to="/dashboard/bookings" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-medium">Service</th>
                      <th className="pb-3 font-medium">Provider</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking._id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 text-sm font-medium text-slate-700">{booking.service.title}</td>
                        <td className="py-3 text-sm text-slate-500">{booking.provider.name}</td>
                        <td className="py-3 text-sm text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[booking.status]}`}>
                            {booking.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-medium text-slate-700 text-right">
                          {booking.isTrialBooking ? "Free trial" : `₦${booking.price.toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Trial Info */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
            <h3 className="font-semibold mb-2">Free Trial</h3>
            <p className="text-white/80 text-sm mb-4">
              You have {trialRemaining} free service booking{trialRemaining === 1 ? "" : "s"} remaining.
            </p>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i <= trialRemaining ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
            <Link to="/dashboard/settings">
              <Button className="w-full bg-white text-teal-600 hover:bg-white/90 rounded-xl text-sm font-medium">
                Upgrade to Premium
              </Button>
            </Link>
          </div>

          {/* Recommended Services */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recommended</h3>
            {recommended.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing to recommend yet.</p>
            ) : (
              <div className="space-y-3">
                {recommended.map((s) => (
                  <Link key={s._id} to={`/services/${s._id}`} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{s.title}</p>
                      <p className="text-xs text-slate-400">{typeof s.provider === "object" ? s.provider.name : ""}</p>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">₦{s.price.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing yet.</p>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item._id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">{item.title}</p>
                      <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
