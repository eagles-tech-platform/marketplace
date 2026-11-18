import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
} from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import {
  ApiError,
  feedbackApi,
  type FeedbackCategory,
  type FeedbackItem,
} from "@/lib/api";

type SupportRole = "customer" | "provider";

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Report a bug" },
  { value: "feature", label: "Feature suggestion" },
  { value: "account", label: "Account issue" },
  { value: "payment", label: "Payment issue" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Other" },
];

const categoryLabels: Record<FeedbackCategory, string> = Object.fromEntries(
  categories.map(({ value, label }) => [value, label])
) as Record<FeedbackCategory, string>;

const statusStyles: Record<FeedbackItem["status"], string> = {
  open: "bg-amber-50 text-amber-700 ring-amber-200",
  replied: "bg-blue-50 text-blue-700 ring-blue-200",
  closed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function SupportCenter({ role }: { role: SupportRole }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const loadFeedback = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await feedbackApi.mine();
      setItems(response.feedback);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not load your feedback history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  // Feedback-reply notifications include #feedback-{id}; scroll to the exact
  // submission after the asynchronous history request has rendered it.
  useEffect(() => {
    if (loading || !window.location.hash.startsWith("#feedback-")) return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [items, loading]);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (cleanSubject.length < 3 || cleanMessage.length < 10) {
      setError("Enter a subject of at least 3 characters and a message of at least 10 characters.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");
    try {
      const response = await feedbackApi.create({
        category,
        subject: cleanSubject,
        message: cleanMessage,
      });
      setItems((current) => [response.feedback, ...current]);
      setSubject("");
      setMessage("");
      setCategory("general");
      setSuccess("Your feedback has been submitted. You can follow its status and our response below.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Your feedback could not be submitted. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const title = role === "provider" ? "Provider Support Centre" : "Customer Support Centre";

  return (
    <DashboardLayout role={role} title="Support Centre">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-teal-800 to-teal-600 p-5 text-white shadow-sm sm:p-7">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <LifeBuoy className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100">Help, feedback & assistance</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50">
                Send feedback to the Marketplace team, report a problem or suggest an improvement. Track every submission and read our replies here.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link to="/contact" className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><LifeBuoy className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">Contact support</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">For account access, booking disputes or urgent assistance.</span></span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700" />
          </Link>
          <Link to="/help" className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><MessageSquareText className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">Help Centre</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Browse guides and answers to common questions.</span></span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700" />
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Send className="h-5 w-5" /></span>
            <div><h3 className="font-semibold text-slate-900">Send feedback</h3><p className="text-xs text-slate-500">Your account role is recorded so the team can distinguish customer and provider feedback.</p></div>
          </div>

          <form onSubmit={submitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-medium text-slate-700">Feedback type
                <select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                  {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block min-w-0 text-sm font-medium text-slate-700">Subject
                <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} minLength={3} required placeholder="Briefly describe your feedback" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Your message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} minLength={10} required rows={5} placeholder="Give us enough detail to understand your feedback..." className="mt-1.5 min-h-32 w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              <span className="mt-1 block text-right text-xs text-slate-400">{message.length}/5000</span>
            </label>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

            <button type="submit" disabled={sending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : <><Send className="h-4 w-4" />Submit feedback</>}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold text-slate-900">My feedback history</h3><p className="mt-1 text-xs text-slate-500">Track submissions and read replies from the team.</p></div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{items.length} total</span><button type="button" onClick={() => void loadFeedback(true)} disabled={refreshing || loading} aria-label="Refresh feedback" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button></div>
          </div>
          {loading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your feedback...</div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700">No feedback submitted yet</p><p className="mt-1 text-xs text-slate-500">Your submissions and team replies will appear here.</p></div> : <div className="space-y-3">{items.map((item) => <article id={`feedback-${item._id}`} key={item._id} className="min-w-0 scroll-mt-24 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h4 className="break-words text-sm font-semibold text-slate-900">{item.subject}</h4><p className="mt-1 text-xs text-slate-500">{categoryLabels[item.category] || "General feedback"} · Submitted {formatDate(item.createdAt)}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[item.status]}`}>{item.status === "open" ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{item.status}</span></div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.message}</p>
            {item.adminReply && <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-3"><p className="text-xs font-semibold text-teal-800">Marketplace team response</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-teal-900">{item.adminReply}</p></div>}
          </article>)}</div>}
        </section>
      </div>
    </DashboardLayout>
  );
}
