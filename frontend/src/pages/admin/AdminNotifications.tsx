import { useEffect, useState } from "react";
import { Send, Megaphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { adminApi, ApiError } from "@/lib/api";

type Target = "all" | "customers" | "providers";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState<Target>("all");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [history, setHistory] = useState<Awaited<ReturnType<typeof adminApi.broadcastHistory>>["broadcasts"]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    adminApi
      .broadcastHistory()
      .then((res) => setHistory(res.broadcasts))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setErrorMessage("Title and message are required.");
      return;
    }
    if (!window.confirm(`Send this announcement to ${target === "all" ? "every user" : target}?`)) return;

    setSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await adminApi.sendBroadcast({ title: title.trim(), message: message.trim(), target, link: link.trim() || undefined });
      setSuccessMessage(res.message);
      setTitle("");
      setMessage("");
      setLink("");
      loadHistory();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not send announcement.");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Announcements">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-800">Send an Announcement</h3>
          </div>

          {errorMessage && <p className="text-sm text-red-600 mb-3">{errorMessage}</p>}
          {successMessage && <p className="text-sm text-green-600 mb-3">{successMessage}</p>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Send to</label>
              <div className="flex gap-2">
                {([
                  { value: "all", label: "Everyone" },
                  { value: "customers", label: "Customers only" },
                  { value: "providers", label: "Providers only" },
                ] as { value: Target; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTarget(opt.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      target === opt.value ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New feature: Get a Recommendation" className="rounded-xl h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Link (optional)</label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/dashboard/services" className="rounded-xl h-11" />
              <p className="text-xs text-slate-400 mt-1">Where tapping the notification takes them — leave blank for none.</p>
            </div>
            <Button onClick={handleSend} disabled={sending} className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send Announcement"}
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sent Announcements</h3>
          {loadingHistory ? (
            <p className="text-sm text-slate-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400">No announcements sent yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((b) => (
                <div key={b._id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-800">{b.title}</p>
                    <span className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{b.message}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.recipientCount} recipient{b.recipientCount === 1 ? "" : "s"}</span>
                    <span className="capitalize">{b.target}</span>
                    {b.sentBy?.name && <span>by {b.sentBy.name}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
