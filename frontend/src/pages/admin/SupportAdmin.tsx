import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { supportAdminApi, type AdminTicket, type TicketStatus } from "../../lib/api";
import StatusBadge from "../../components/support/StatusBadge";

// Wrap this page in your existing admin-only route guard.
const FILTERS: { value: "" | TicketStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];
const fmt = (d: string) => new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default function SupportAdmin() {
  const [status, setStatus] = useState<"" | TicketStatus>("open");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminTicket[]; total: number; pages: number } | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [list, s] = await Promise.all([supportAdminApi.tickets({ status: status || undefined, q: q.trim() || undefined, page }), supportAdminApi.stats()]);
      setData(list); setStats(s);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setLoading(false); }
  }, [status, q, page]);

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const selected = data?.items.find((t) => t._id === selectedId) ?? null;
  const replaceTicket = (t: AdminTicket) => setData((d) => d && { ...d, items: d.items.map((x) => (x._id === t._id ? t : x)) });

  async function changeStatus(s: TicketStatus) {
    if (!selected) return;
    try { replaceTicket(await supportAdminApi.setStatus(selected._id, s)); supportAdminApi.stats().then(setStats); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update the status."); }
  }
  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!selected || reply.trim().length < 2) return;
    try { replaceTicket(await supportAdminApi.reply(selected._id, reply.trim())); setReply(""); supportAdminApi.stats().then(setStats); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send the reply."); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Support inbox</h1>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {FILTERS.map((f) => (
            <button key={f.value} role="tab" aria-selected={status === f.value} onClick={() => { setStatus(f.value); setPage(1); setSelectedId(null); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === f.value ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              {f.label}{f.value ? ` (${stats[f.value] ?? 0})` : stats.total != null ? ` (${stats.total})` : ""}
            </button>
          ))}
        </div>
        <div className="relative">
          <label htmlFor="admin-search" className="sr-only">Search tickets</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input id="admin-search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Ticket ID, name, email, subject"
            className="w-72 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-teal-600" />
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section aria-label="Tickets" className="lg:col-span-2">
          {loading && !data ? (
            <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading</p>
          ) : data && data.items.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-5 text-slate-600">No tickets match this view.</p>
          ) : (
            <ul className="space-y-2">
              {data?.items.map((t) => (
                <li key={t._id}>
                  <button onClick={() => setSelectedId(t._id)} aria-current={t._id === selectedId}
                    className={`w-full rounded-xl border p-4 text-left ${t._id === selectedId ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                    <span className="flex items-center justify-between gap-2"><span className="truncate font-medium text-slate-900">{t.subject}</span><StatusBadge status={t.status} /></span>
                    <span className="mt-1 block truncate text-sm text-slate-600">{t.name} · {t.email}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{t.ticketId} · {fmt(t.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data && data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span className="text-slate-600">Page {page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          )}
        </section>

        <section aria-label="Ticket detail" className="lg:col-span-3">
          {!selected ? (
            <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">Select a ticket to read it and reply.</p>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selected.subject}</h2>
                  <p className="text-sm text-slate-600">{selected.name} · <a className="text-teal-700 hover:underline" href={`mailto:${selected.email}`}>{selected.email}</a>{selected.phone ? ` · ${selected.phone}` : ""}</p>
                  <p className="text-xs text-slate-500">{selected.ticketId} · topic: {selected.topic}</p>
                </div>
                <label className="text-sm text-slate-700">Status{" "}
                  <select value={selected.status} onChange={(e) => changeStatus(e.target.value as TicketStatus)} className="ml-1 rounded-lg border border-slate-300 px-2 py-1.5">
                    <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
                  </select>
                </label>
              </div>

              <ol className="mt-5 space-y-3">
                <li className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">{selected.name} · {fmt(selected.createdAt)}</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{selected.message}</p></li>
                {selected.replies.map((r, i) => (
                  <li key={i} className={`rounded-lg p-4 ${r.by === "staff" ? "bg-teal-50" : "bg-slate-50"}`}>
                    <p className="text-xs font-medium text-slate-500">{r.by === "staff" ? "Support" : selected.name} · {fmt(r.at)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{r.message}</p>
                  </li>
                ))}
              </ol>

              <form onSubmit={sendReply} className="mt-5">
                <label htmlFor="admin-reply" className="mb-1.5 block text-sm font-medium text-slate-900">Reply (sent to {selected.email})</label>
                <textarea id="admin-reply" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={3000} className="w-full rounded-lg border border-slate-300 p-3 focus:outline focus:outline-2 focus:outline-teal-600" />
                <button disabled={reply.trim().length < 2} className="mt-3 rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60">Send reply</button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
