import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  DollarSign,
  List,
  Wrench,
  TrendingUp,
  Star,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { bookingApi, serviceApi, reviewApi, ApiError, type BookingItem, type ReviewItem } from "@/lib/api";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const quickActions = [
  { label: "Add Service", icon: TrendingUp, path: "/provider/services", color: "from-teal-500 to-teal-600" },
  { label: "View Services", icon: List, path: "/provider/services", color: "from-blue-500 to-blue-600" },
  { label: "Check Messages", icon: MessageSquare, path: "/provider/chat", color: "from-purple-500 to-purple-600" },
  { label: "Earnings", icon: DollarSign, path: "/provider/earnings", color: "from-green-500 to-green-600" },
];

export default function ProviderDashboard() {
  const [recentBookings, setRecentBookings] = useState<BookingItem[]>([]);
  const [serviceCount, setServiceCount] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    bookingApi
      .mine()
      .then((res) => setRecentBookings(res.bookings.slice(0, 5)))
      .catch(() => setRecentBookings([]));
    serviceApi
      .mine()
      .then((res) => setServiceCount(res.services.length))
      .catch(() => setServiceCount(null));
    reviewApi
      .mine()
      .then((res) => {
        setReviews(res.reviews);
        setRatingAvg(res.ratingAvg);
        setRatingCount(res.ratingCount);
      })
      .catch(() => setReviews([]));
  }, []);

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await reviewApi.reply(reviewId, replyText.trim());
      setReviews((prev) => prev.map((r) => (r._id === reviewId ? res.review : r)));
      setReplyingId(null);
      setReplyText("");
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Could not post reply.");
    }
  };

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    percent: reviews.length ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const activeJobs = recentBookings.filter((b) => b.status === "in_progress").length;
  const completedJobs = recentBookings.filter((b) => b.status === "completed").length;

  const stats = [
    { label: "Services Listed", value: serviceCount ?? "—", icon: List, color: "bg-blue-50 text-blue-600" },
    { label: "Active Jobs", value: activeJobs, icon: Wrench, color: "bg-purple-50 text-purple-600" },
    { label: "Completed Jobs", value: completedJobs, icon: ClipboardList, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <DashboardLayout role="provider" title="Provider Dashboard">
      {/* Stats */}
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
        {/* Quick Actions & Bookings */}
        <div className="lg:col-span-2 space-y-6">
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
              <Link to="/provider/bookings" className="text-sm text-teal-600 hover:text-teal-700 font-medium">View all</Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No bookings yet.</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b._id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 text-sm font-medium text-slate-700">{b.service.title}</td>
                      <td className="py-3 text-sm text-slate-500">{b.customer.name}</td>
                      <td className="py-3 text-sm text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[b.status]}`}>
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-medium text-slate-700 text-right">
                        {b.isTrialBooking ? "Free trial" : `₦${b.price.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rating Card */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="w-7 h-7 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <p className="text-3xl font-bold">{ratingAvg > 0 ? ratingAvg.toFixed(1) : "—"}</p>
                <p className="text-white/80 text-sm">{ratingCount > 0 ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}` : "No ratings yet"}</p>
              </div>
            </div>
            <div className="space-y-2">
              {distribution.map(({ star, percent }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs w-3">{star}</span>
                  <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-300 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Reviews</h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-400">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review._id} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{review.customer.name}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-slate-500">{review.comment}</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>

                    {review.providerReply ? (
                      <div className="mt-2 ml-3 pl-3 border-l-2 border-teal-200">
                        <p className="text-xs font-medium text-teal-700">Your reply</p>
                        <p className="text-xs text-slate-500">{review.providerReply}</p>
                      </div>
                    ) : replyingId === review._id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Write a reply..."
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-teal-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => submitReply(review._id)} className="text-xs text-teal-600 font-medium">Post</button>
                          <button onClick={() => { setReplyingId(null); setReplyText(""); }} className="text-xs text-slate-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setReplyingId(review._id)} className="text-xs text-teal-600 font-medium mt-1">
                        Reply
                      </button>
                    )}
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
