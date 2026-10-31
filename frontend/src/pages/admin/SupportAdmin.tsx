import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { supportAdminApi, ApiError, type AdminTicket, type TicketStatus } from "@/lib/api";
import StatusBadge from "@/components/support/StatusBadge";

const FILTERS: { value: "" | TicketStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];
const fmt = (d: string) => new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function SupportAdmin() {
  const [status, setStatus] = useState<"" | TicketStatus>("open");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminTicket[]; total: number; pages: number } | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [list, s] = await Promise.all([
        supportAdminApi.tickets({ status: status || undefined, q: q.trim() || undefined, page }),
        supportAdminApi.stats(),
      ]);
      setData(list);
      setStats(s);
    } catch (err) {
      setErrorMessage(message(err, "Could not load support tickets."));
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0); // small delay while typing in the search box
    return () => clearTimeout(t);
  }, [load, q]);

  const selected = data?.items.find((t) => t._id === selectedId) ?? null;
  const replaceTicket = (t: AdminTicket) =>
    setData((d) => (d ? { ...d, items: d.items.map((x) => (x._id === t._id ? t : x)) } : d));

  const changeStatus = async (s: TicketStatus) => {
    if (!selected) return;
    setBusy(true);
    try {
      replaceTicket(await supportAdminApi.setStatus(selected._id, s));
      supportAdminApi.stats().then(setStats).catch(() => {});
    } catch (err) {
      setErrorMessage(message(err, "Could not update the status."));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || reply.trim().length < 2) return;
    setBusy(true);
    try {
      replaceTicket(await supportAdminApi.reply(selected._id, reply.trim()));
      setReply("");
      supportAdminApi.stats().then(setStats).catch(() => {});
    } catch (err) {
      setErrorMessage(message(err, "Could not send the reply."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Support">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); setSelectedId(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${status === f.value ? "bg-teal-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {f.label}
            {f.value ? ` (${stats[f.value] ?? 0})` : stats.total != null ? ` (${stats.total})` : ""}
          </button>
        ))}
        <div className="relative ml-auto">
          <label htmlFor="support-search" className="sr-only">Search tickets</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="support-search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Ticket ID, name, email, subject"
            className="w-72 max-w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section aria-label="Tickets" className="lg:col-span-2">
          {loading && !data ? (
            <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading tickets...</p>
          ) : data && data.items.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tickets in this view</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data?.items.map((t) => (
                <li key={t._id}>
                  <button
                    onClick={() => setSelectedId(t._id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${t._id === selectedId ? "border-teal-500 bg-teal-50" : "border-slate-100 bg-white shadow-sm hover:border-slate-300"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{t.subject}</span>
                      <StatusBadge status={t.status} />
                    </span>
                    <span className="mt-1 block truncate text-sm text-slate-600">{t.name} · {t.email}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{t.ticketId} · {fmt(t.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {data && data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <Button variant="outline" size="sm" className="rounded-lg" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-slate-500">Page {page} of {data.pages}</span>
              <Button variant="outline" size="sm" className="rounded-lg" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </section>

        <section aria-label="Ticket detail" className="lg:col-span-3">
          {!selected ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-500">Select a ticket to read it and reply</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{selected.subject}</h2>
                  <p className="text-sm text-slate-600">
                    {selected.name} · <a className="text-teal-600 hover:underline" href={`mailto:${selected.email}`}>{selected.email}</a>
                    {selected.phone ? ` · ${selected.phone}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">{selected.ticketId} · topic: {selected.topic}</p>
                </div>
                <label className="text-sm text-slate-600">
                  Status{" "}
                  <select
                    value={selected.status}
                    disabled={busy}
                    onChange={(e) => changeStatus(e.target.value as TicketStatus)}
                    className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
              </div>

              <ol className="mt-5 space-y-3">
                <li className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">{selected.name} · {fmt(selected.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selected.message}</p>
                </li>
                {selected.replies.map((r, i) => (
                  <li key={i} className={`rounded-xl p-4 ${r.by === "staff" ? "bg-teal-50 border border-teal-100" : "bg-slate-50"}`}>
                    <p className={`text-xs font-medium ${r.by === "staff" ? "text-teal-700" : "text-slate-500"}`}>
                      {r.by === "staff" ? "Support" : selected.name} · {fmt(r.at)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.message}</p>
                  </li>
                ))}
              </ol>

              <form onSubmit={sendReply} className="mt-5">
                <label htmlFor="support-reply" className="mb-1.5 block text-sm font-medium text-slate-700">Reply (emailed to {selected.email})</label>
                <Textarea id="support-reply" rows={5} value={reply} maxLength={3000} onChange={(e) => setReply(e.target.value)} className="rounded-xl text-sm" />
                <Button type="submit" disabled={busy || reply.trim().length < 2} className="mt-3 rounded-lg bg-teal-500 hover:bg-teal-600">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reply
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}