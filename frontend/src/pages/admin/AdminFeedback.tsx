import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Mail, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { feedbackApi, ApiError, type FeedbackItem } from "@/lib/api";

const statusConfig: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  replied: "bg-blue-100 text-blue-700",
  closed: "bg-green-100 text-green-700",
};

const categoryLabels: Record<string, string> = {
  general: "General feedback",
  bug: "Bug report",
  feature: "Feature suggestion",
  account: "Account issue",
  payment: "Payment issue",
  safety: "Safety concern",
  other: "Other",
};

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const res = await feedbackApi.list({
        status: statusFilter,
        role: roleFilter,
        category: categoryFilter,
      });
      setItems(res.feedback);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load feedback.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, roleFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await feedbackApi.reply(id, replyText.trim());
      setItems((prev) => prev.map((item) => (item._id === id ? res.feedback : item)));
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
    setErrorMessage(null);
    try {
      const res = await feedbackApi.close(id);
      setItems((prev) => prev.map((item) => (item._id === id ? res.feedback : item)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update feedback.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout role="admin" title="Customer & Provider Feedback">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Feedback inbox</h2>
              <p className="mt-1 text-sm text-slate-500">Review submissions by account role, category and status. Replies appear in the submitter's Support Centre.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void load(true)} disabled={refreshing || loading} className="gap-2 rounded-xl">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">Submitter role
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800">
                <option value="all">All accounts</option><option value="customer">Customers</option><option value="provider">Providers</option><option value="admin">Administrators</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Feedback category
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800">
                <option value="all">All categories</option>
                {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800">
                <option value="all">All statuses</option><option value="open">Open</option><option value="replied">Replied</option><option value="closed">Closed</option>
              </select>
            </label>
          </div>
        </section>

        {errorMessage && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}

        {loading ? <p className="py-8 text-sm text-slate-400">Loading feedback...</p> : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-700">No feedback matches these filters</p>
            <p className="mt-1 text-sm text-slate-500">Try another role, category or status.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500">{items.length} matching submission{items.length === 1 ? "" : "s"}</p>
            {items.map((item) => {
              const submitter = typeof item.user === "object" ? item.user : null;
              const role = item.userRole || submitter?.activeRole || "unknown";
              return (
                <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><MessageCircle className="h-5 w-5 text-slate-500" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusConfig[item.status] || "bg-slate-100 text-slate-600"}`}>{item.status}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${role === "provider" ? "bg-violet-50 text-violet-700" : role === "customer" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{role}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{categoryLabels[item.category] || "Legacy feedback"}</span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{submitter?.name || "Marketplace user"}</p>
                      {submitter?.email && <p className="text-xs text-slate-500">{submitter.email}</p>}
                      <h3 className="mt-3 break-words text-base font-semibold text-slate-800">{item.subject}</h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.message}</p>

                      {item.adminReply && <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-3"><p className="mb-1 text-xs font-semibold text-teal-700">Admin reply</p><p className="whitespace-pre-wrap text-sm text-teal-900">{item.adminReply}</p></div>}

                      <div className="mt-4 flex flex-wrap items-start gap-2">
                        {item.status !== "closed" && <Button onClick={() => void markClosed(item._id)} disabled={busyId === item._id} size="sm" variant="outline" className="rounded-lg text-xs"><Clock className="mr-1 h-3 w-3" />Mark closed</Button>}
                        {replyingTo === item._id ? (
                          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                            <Textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Type your reply..." rows={3} maxLength={5000} className="min-w-0 flex-1 rounded-xl text-sm" />
                            <div className="flex shrink-0 gap-2 sm:flex-col">
                              <Button onClick={() => void sendReply(item._id)} disabled={busyId === item._id || !replyText.trim()} size="sm" className="rounded-lg bg-teal-600 hover:bg-teal-700"><CheckCircle2 className="mr-1 h-3 w-3" />Send reply</Button>
                              <Button onClick={() => { setReplyingTo(null); setReplyText(""); }} size="sm" variant="outline" className="rounded-lg">Cancel</Button>
                            </div>
                          </div>
                        ) : <Button onClick={() => { setReplyingTo(item._id); setReplyText(""); }} size="sm" variant="outline" className="rounded-lg text-xs"><Mail className="mr-1 h-3 w-3" />Reply</Button>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
