import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { supportApi, type TrackedTicket } from "../lib/api";
import StatusBadge from "../components/support/StatusBadge";

const fmt = (d: string) => new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default function TrackTicket() {
  const [ticketId, setTicketId] = useState("");
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<TrackedTicket | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  useEffect(() => { document.title = "Check your ticket | Quantum MarketPlace"; }, []);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try { setTicket(await supportApi.track(ticketId.trim().toUpperCase(), email.trim())); }
    catch (err) { setTicket(null); setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!ticket || reply.trim().length < 2) return;
    setError(""); setBusy(true);
    try { setTicket(await supportApi.customerReply(ticket.ticketId, email.trim(), reply.trim())); setReply(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  const box = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:outline focus:outline-2 focus:outline-teal-600";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold text-slate-900">Check your ticket</h1>
      <p className="mt-2 text-slate-600">Enter the ticket ID we gave you and the email you used.</p>

      <form onSubmit={lookup} className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tid" className="mb-1.5 block text-sm font-medium text-slate-900">Ticket ID</label>
          <input id="tid" value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="QM-1A2B3C4D" className={`${box} font-mono`} required />
        </div>
        <div>
          <label htmlFor="temail" className="mb-1.5 block text-sm font-medium text-slate-900">Email address</label>
          <input id="temail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={box} required />
        </div>
        <div className="sm:col-span-2">
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
            {busy && !ticket && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Find my ticket
          </button>
        </div>
      </form>

      {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

      {ticket && (
        <section className="mt-10" aria-label="Ticket details">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{ticket.subject}</h2>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{ticket.ticketId} · opened {fmt(ticket.createdAt)}</p>

          <ol className="mt-6 space-y-4">
            <li className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">You wrote</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{ticket.message}</p></li>
            {ticket.replies.map((r, i) => (
              <li key={i} className={`rounded-xl p-4 ${r.by === "staff" ? "bg-teal-50" : "bg-slate-50"}`}>
                <p className="text-xs font-medium text-slate-500">{r.by === "staff" ? "Quantum MarketPlace support" : "You"} · {fmt(r.at)}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{r.message}</p>
              </li>
            ))}
          </ol>

          <form onSubmit={sendReply} className="mt-6">
            <label htmlFor="reply" className="mb-1.5 block text-sm font-medium text-slate-900">{ticket.status === "resolved" ? "Need more help? Reply to reopen this ticket" : "Add a reply"}</label>
            <textarea id="reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={3000} className={box} />
            <button disabled={busy || reply.trim().length < 2} className="mt-3 rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60">Send reply</button>
          </form>
        </section>
      )}

      <p className="mt-12 text-sm text-slate-600">No ticket yet? <Link to="/contact" className="font-medium text-teal-700 underline">Contact us</Link> or visit the <Link to="/help" className="font-medium text-teal-700 underline">Help Center</Link>.</p>
    </main>
  );
}
