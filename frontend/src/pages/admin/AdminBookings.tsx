import { useEffect, useState } from "react";
import { ClipboardList, Clock, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { adminApi, ApiError } from "@/lib/api";

const tabs: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle2,
  in_progress: ClipboardList,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export default function AdminBookings() {
  const [activeTab, setActiveTab] = useState("");
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof adminApi.bookings>>["bookings"]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .bookings(activeTab || undefined)
      .then((res) => setBookings(res.bookings))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load bookings."))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <DashboardLayout role="admin" title="All Bookings">
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value ? "bg-teal-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6">Loading bookings...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 font-medium">Service</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const StatusIcon = statusIcons[b.status] || ClipboardList;
                  return (
                    <tr key={b._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">{b.customer?.name || "Unknown"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{b.provider?.name || "Unknown"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{b.service?.title || "Service"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 text-right">₦{b.price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[b.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && bookings.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No bookings found in this category.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
