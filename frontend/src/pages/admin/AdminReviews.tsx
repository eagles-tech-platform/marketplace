import { useEffect, useState } from "react";
import { Star, Trash2, MessageSquareOff } from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { reviewApi, ApiError, type ReviewItem } from "@/lib/api";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.adminList();
      setReviews(res.reviews);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (review: ReviewItem) => {
    if (!window.confirm("Remove this review permanently? The service and provider ratings will be recalculated.")) return;
    setBusyId(review._id);
    setErrorMessage(null);
    try {
      await reviewApi.remove(review._id);
      setReviews((prev) => prev.filter((r) => r._id !== review._id));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not remove review.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout role="admin" title="Review Moderation">
      <p className="text-slate-500 mb-6">Remove abusive or inappropriate reviews ({reviews.length} total)</p>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <MessageSquareOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const serviceTitle = typeof review.service === "object" ? review.service.title : "";
            const providerName = typeof review.provider === "object" ? review.provider.name : "";
            return (
              <div key={review._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <img src={review.customer.avatar || "/avatar-customer-1.jpg"} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{review.customer.name}</p>
                      <p className="text-xs text-slate-400">on {serviceTitle} · {providerName}</p>
                    </div>
                    <div className="flex items-center gap-0.5 ml-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-slate-600 mt-2">{review.comment}</p>}
                  {review.providerReply && (
                    <div className="mt-2 ml-4 pl-3 border-l-2 border-teal-200">
                      <p className="text-xs font-medium text-teal-700">Provider reply</p>
                      <p className="text-sm text-slate-600">{review.providerReply}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => remove(review)}
                  disabled={busyId === review._id}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                  title="Remove review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
