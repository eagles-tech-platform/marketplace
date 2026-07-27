import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { bookingApi, paymentApi, reviewApi, ApiError, type BookingItem, type BookingStatus } from "@/lib/api";

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

export default function CustomerBookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BookingStatus | "All">("All");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eligibleForReview, setEligibleForReview] = useState<Set<string>>(new Set());
  const [reviewingBooking, setReviewingBooking] = useState<BookingItem | null>(null);

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

  useEffect(() => {
    reviewApi
      .eligibleBookings()
      .then((res) => setEligibleForReview(new Set(res.bookingIds)))
      .catch(() => setEligibleForReview(new Set()));
  }, [bookings.length]);

  const handleCancel = async (booking: BookingItem) => {
    if (!window.confirm(`Cancel your booking for "${booking.service.title}"?`)) return;
    setBusyId(booking._id);
    try {
      const res = await bookingApi.updateStatus(booking._id, "cancelled");
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? res.booking : b)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not cancel booking.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePay = async (booking: BookingItem) => {
    setBusyId(booking._id);
    setErrorMessage(null);
    try {
      const res = await paymentApi.initialize({ purpose: "booking_payment", gateway: "paystack", bookingId: booking._id });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl; // live mode — send them to the real gateway
        return;
      }
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, paymentStatus: "paid" } : b)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not start payment.");
    } finally {
      setBusyId(null);
    }
  };

  const handleChat = (booking: BookingItem) => {
    navigate(`/dashboard/chat?with=${booking.provider._id}`);
  };

  const handleReviewSubmitted = (bookingId: string) => {
    setEligibleForReview((prev) => {
      const next = new Set(prev);
      next.delete(bookingId);
      return next;
    });
    setReviewingBooking(null);
  };

  return (
    <DashboardLayout role="customer" title="My Bookings">
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
        <p className="text-sm text-slate-400">Loading your bookings...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bookings.map((booking) => {
            const StatusIcon = statusConfig[booking.status]?.icon || AlertCircle;
            const canReview = booking.status === "completed" && eligibleForReview.has(booking._id);
            const alreadyReviewed = booking.status === "completed" && !eligibleForReview.has(booking._id);
            return (
              <div key={booking._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={booking.provider.avatar || "/avatar-provider-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="font-semibold text-slate-800">{booking.service.title}</h4>
                      <p className="text-sm text-slate-500">{booking.provider.name}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[booking.status]?.class}`}>
                    <StatusIcon className="w-3 h-3" />
                    {booking.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Booked</span>
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
                  {!booking.isTrialBooking && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Payment</span>
                      <span className={`font-medium ${booking.paymentStatus === "paid" ? "text-green-600" : "text-orange-500"}`}>
                        {booking.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!booking.isTrialBooking && booking.paymentStatus === "unpaid" && booking.status !== "cancelled" && (
                    <Button
                      size="sm"
                      disabled={busyId === booking._id}
                      onClick={() => handlePay(booking)}
                      className="flex-1 rounded-lg text-xs bg-gradient-to-r from-teal-500 to-orange-500 text-white"
                    >
                      Pay Now
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleChat(booking)} className="flex-1 rounded-lg text-xs border-slate-200">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Chat
                  </Button>
                  {canReview && (
                    <Button
                      size="sm"
                      onClick={() => setReviewingBooking(booking)}
                      className="flex-1 rounded-lg text-xs bg-gradient-to-r from-teal-500 to-orange-500 text-white"
                    >
                      <Star className="w-3.5 h-3.5 mr-1" />
                      Review
                    </Button>
                  )}
                  {alreadyReviewed && (
                    <Button size="sm" disabled className="flex-1 rounded-lg text-xs border-slate-200" variant="outline">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Reviewed
                    </Button>
                  )}
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === booking._id}
                      onClick={() => handleCancel(booking)}
                      className="flex-1 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
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

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          onClose={() => setReviewingBooking(null)}
          onSubmitted={() => handleReviewSubmitted(reviewingBooking._id)}
        />
      )}
    </DashboardLayout>
  );
}

function ReviewModal({ booking, onClose, onSubmitted }: { booking: BookingItem; onClose: () => void; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await reviewApi.create({ bookingId: booking._id, rating, comment });
      onSubmitted();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Review {booking.provider.name}</h3>
        <p className="text-sm text-slate-500 mb-4">{booking.service.title}</p>

        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)}>
              <Star className={`w-8 h-8 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}`} />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was the service? (optional)"
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none mb-4"
        />

        {errorMessage && <p className="text-sm text-red-600 mb-3">{errorMessage}</p>}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-orange-500 text-white">
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
