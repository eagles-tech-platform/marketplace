import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { feedbackApi, ApiError, type FeedbackItem } from "@/lib/api";

const statusConfig: Record<string, { class: string }> = {
  open: { class: "bg-yellow-100 text-yellow-700" },
  replied: { class: "bg-blue-100 text-blue-700" },
  closed: { class: "bg-green-100 text-green-700" },
};

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await feedbackApi.list();
      setItems(res.feedback);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    setBusyId(id);
    try {
      const res = await feedbackApi.reply(id, replyText.trim());
      setItems((prev) => prev.map((i) => (i._id === id ? res.feedback : i)));
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not send reply.");
    } finally {
      setBusyId(null);
    }
  };

  const markClosed = async (id: string) => {
    setBusyId(id);
    try {
      const res = await feedbackApi.close(id);
      setItems((prev) => prev.map((i) => (i._id === id ? res.feedback : i)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update feedback.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout role="admin" title="User Feedback">
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "open", "replied", "closed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${filter === f ? "bg-teal-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {f}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading feedback...</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const user = typeof item.user === "object" ? item.user : null;
            return (
              <div key={item._id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig[item.status]?.class}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 mb-0.5">{user?.name || "User"}</p>
                    <p className="text-xs text-slate-400 mb-2">{item.subject}</p>
                    <p className="text-sm text-slate-600 mb-3">{item.message}</p>

                    {item.adminReply && (
                      <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-3">
                        <p className="text-xs font-medium text-teal-700 mb-1">Admin Reply:</p>
                        <p className="text-sm text-teal-800">{item.adminReply}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {item.status !== "closed" && (
                        <Button onClick={() => markClosed(item._id)} disabled={busyId === item._id} size="sm" variant="outline" className="rounded-lg text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Mark Closed
                        </Button>
                      )}
                      {replyingTo === item._id ? (
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows={2}
                            className="flex-1 rounded-xl text-sm"
                          />
                          <div className="flex flex-col gap-2">
                            <Button onClick={() => sendReply(item._id)} disabled={busyId === item._id} size="sm" className="bg-teal-500 hover:bg-teal-600 rounded-lg">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Send
                            </Button>
                            <Button onClick={() => setReplyingTo(null)} size="sm" variant="outline" className="rounded-lg">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button onClick={() => setReplyingTo(item._id)} size="sm" variant="outline" className="rounded-lg text-xs">
                          <Mail className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-500">No feedback items in this category</p>
        </div>
      )}
    </DashboardLayout>
  );
}
