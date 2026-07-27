import { useEffect, useState } from "react";
import { CreditCard, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { adminApi, ApiError } from "@/lib/api";

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof adminApi.payments>>["payments"]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalPayouts: 0, pendingPayouts: 0, totalFees: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .payments()
      .then((res) => {
        setPayments(res.payments);
        setSummary(res.summary);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load payments."))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Platform Revenue", value: `₦${(summary.totalRevenue / 1000).toFixed(0)}K`, icon: CreditCard, color: "bg-green-50 text-green-600" },
    { label: "Provider Payouts", value: `₦${(summary.totalPayouts / 1000).toFixed(0)}K`, icon: ArrowUpRight, color: "bg-blue-50 text-blue-600" },
    { label: "Pending Withdrawals", value: `₦${(summary.pendingPayouts / 1000).toFixed(0)}K`, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Fees Collected", value: `₦${(summary.totalFees / 1000).toFixed(0)}K`, icon: ArrowDownLeft, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <DashboardLayout role="admin" title="Payments & Commissions">
      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6">Loading payments...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Gateway</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{p.user?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{p.purpose.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{p.provider.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 text-right">₦{p.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[p.status]}`}>
                        {p.status === "success" && <CheckCircle2 className="w-3 h-3" />}
                        {p.status === "pending" && <Clock className="w-3 h-3" />}
                        {p.status === "failed" && <XCircle className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && payments.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No payments recorded yet.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
