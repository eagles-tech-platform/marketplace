import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { paymentApi, ApiError, type WithdrawalItem } from "@/lib/api";

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await paymentApi.listWithdrawals();
      setWithdrawals(res.withdrawals);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load withdrawal requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, decision: "paid" | "reject") => {
    const reason = decision === "reject" ? window.prompt("Reason for declining (shown to the provider):") || "" : "";
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await paymentApi.decideWithdrawal(id, decision, reason);
      setWithdrawals((prev) => prev.map((w) => (w._id === id ? res.withdrawal : w)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not process decision.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = withdrawals.filter((w) => w.status === "pending");
  const resolved = withdrawals.filter((w) => w.status !== "pending");

  return (
    <DashboardLayout role="admin" title="Withdrawal Requests">
      <p className="text-slate-500 mb-6">Manual payout fallback — {pending.length} pending</p>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading requests...</p>
      ) : pending.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 mb-8">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No pending withdrawal requests.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {pending.map((w) => {
            const user = typeof w.user === "object" ? w.user : null;
            return (
              <div key={w._id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{user?.name || "Provider"}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                  <span className="text-xl font-bold text-teal-600">₦{w.amount.toLocaleString()}</span>
                </div>
                {w.meta?.note && <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 mb-3">{w.meta.note}</p>}
                <p className="text-xs text-slate-400 mb-4">{new Date(w.createdAt).toLocaleString()}</p>
                <div className="flex gap-3">
                  <Button onClick={() => decide(w._id, "paid")} disabled={busyId === w._id} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Paid
                  </Button>
                  <Button onClick={() => decide(w._id, "reject")} disabled={busyId === w._id} variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl">
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">Resolved</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {resolved.map((w) => {
              const user = typeof w.user === "object" ? w.user : null;
              return (
                <div key={w._id} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {w.status === "success" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    <span className="text-sm font-medium text-slate-700">{user?.name || "Provider"} — ₦{w.amount.toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-slate-400">{w.status === "success" ? "Paid" : "Declined"}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
