import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell } from "lucide-react";
import { notificationApi, type NotificationItem } from "@/lib/api";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationApi.mine();
      setItems(res.notifications);
      setUnread(res.unreadCount);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // poll every 30s
    return () => clearInterval(t);
  }, [load]);

  const handleRead = async (n: NotificationItem) => {
    setOpen(false);
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await notificationApi.markRead(n._id);
    } catch {
      load();
    }
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      load();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-100 bg-white py-2 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              <button
                onClick={handleReadAll}
                disabled={unread === 0}
                className="text-xs text-teal-600 hover:text-teal-700 disabled:opacity-40"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading && <p className="px-4 py-6 text-center text-sm text-slate-400">Loading…</p>}
              {!loading && failed && (
                <p className="px-4 py-6 text-center text-sm text-red-500">Couldn't load notifications.</p>
              )}
              {!loading && !failed && items.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-400">You're all caught up.</p>
              )}

              {items.map((n) => {
                const cls = `block w-full border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${
                  n.isRead ? "" : "bg-teal-50/40"
                }`;
                const body = (
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n._id} to={n.link} onClick={() => handleRead(n)} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <button key={n._id} onClick={() => handleRead(n)} className={cls}>
                    {body}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}