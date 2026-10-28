import { useEffect, useState } from "react";
import { ClipboardList, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { bookingApi, ApiError, type BookingItem, type BookingStatus } from "@/lib/api";

const tabs: { label: string; value: BookingStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusConfig: Record<string, { icon: typeof Clock; class: string }> = {
  pending: { icon: Clock, class: "bg-yellow-100 text-yellow-700" },
  confirmed: { icon: CheckCircle2, class: "bg-blue-100 text-blue-700" },
  in_progress: { icon: Clock, class: "bg-purple-100 text-purple-700" },
  completed: { icon: CheckCircle2, class: "bg-green-100 text-green-700" },
  cancelled: { icon: XCircle, class: "bg-red-100 text-red-700" },
};

// What a provider can move a booking to, from its current status
const nextSteps: Partial<Record<BookingStatus, { label: string; value: BookingStatus }[]>> = {
  pending: [{ label: "Confirm", value: "confirmed" }],
  confirmed: [{ label: "Start Job", value: "in_progress" }],
  in_progress: [{ label: "Mark Completed", value: "completed" }],
};

export default function ProviderBookings() {
  const [activeTab, setActiveTab] = useState<BookingStatus | "All">("All");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await bookingApi.mine(activeTab === "All" ? undefined : activeTab);
      setBookings(res.bookings);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load your bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleUpdate = async (booking: BookingItem, status: BookingStatus) => {
    setBusyId(booking._id);
    setErrorMessage(null);
    try {
      const res = await bookingApi.updateStatus(booking._id, status);
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? res.booking : b)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update booking.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout role="provider" title="Bookings">
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-teal-500 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading bookings...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bookings.map((booking) => {
            const StatusIcon = statusConfig[booking.status]?.icon || AlertCircle;
            const actions = nextSteps[booking.status] || [];
            return (
              <div key={booking._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={booking.customer.avatar || "/avatar-customer-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="font-semibold text-slate-800">{booking.service.title}</h4>
                      <p className="text-sm text-slate-500">{booking.customer.name}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[booking.status]?.class}`}>
                    <StatusIcon className="w-3 h-3" />
                    {booking.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Requested</span>
                    <span className="text-slate-700">{new Date(booking.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Type</span>
                    <span className="text-slate-700 capitalize">{booking.type.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold text-teal-600">
                      {booking.isTrialBooking ? "Free trial" : `₦${booking.price.toLocaleString()}`}
                    </span>
                  </div>
                  {booking.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 mt-2">{booking.notes}</p>
                  )}
                </div>

                {actions.length > 0 && (
                  <div className="flex gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action.value}
                        size="sm"
                        disabled={busyId === booking._id}
                        onClick={() => handleUpdate(booking, action.value)}
                        className="flex-1 rounded-lg text-xs bg-gradient-to-r from-teal-500 to-orange-500 text-white"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No bookings found in this category</p>
        </div>
      )}
    </DashboardLayout>
  );
}
