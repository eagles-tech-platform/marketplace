import type { TicketStatus } from "../../lib/api";

const STYLES: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  in_progress: { label: "In progress", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  resolved: { label: "Resolved", cls: "bg-teal-50 text-teal-700 ring-teal-200" },
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  const s = STYLES[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>{s.label}</span>;
}
