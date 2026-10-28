import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, ArrowUpRight, Wallet, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { paymentApi, ApiError, type WithdrawalItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

type Transaction = { id: string; date: string; customer: string; service: string; amount: number; fee: number; net: number; status: string };

export default function ProviderEarnings() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [monthlyOverview, setMonthlyOverview] = useState<{ month: string; earnings: number; jobs: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const loadWithdrawals = () => {
    paymentApi.myWithdrawals().then((res) => setWithdrawals(res.withdrawals)).catch(() => setWithdrawals([]));
  };

  const submitWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setErrorMessage("Enter a valid amount.");
      return;
    }
    setSubmittingWithdraw(true);
    setErrorMessage(null);
    try {
      await paymentApi.requestWithdrawal({ amount, note: withdrawNote });
      setShowWithdrawForm(false);
      setWithdrawAmount("");
      setWithdrawNote("");
      loadWithdrawals();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not submit withdrawal request.");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  useEffect(() => {
    paymentApi
      .earnings()
      .then((res) => {
        setTransactions(res.transactions);
        setTotalEarnings(res.totalEarnings);
        setTotalFees(res.totalFees);
        setMonthlyOverview(res.monthlyOverview);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load earnings."))
      .finally(() => setLoading(false));
    loadWithdrawals();
  }, []);

  const stats = [
    { label: "Total Earnings", value: `₦${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "bg-green-50 text-green-600" },
    { label: "Completed Payments", value: String(transactions.length), icon: Wallet, color: "bg-blue-50 text-blue-600" },
    { label: "This Month", value: `₦${(monthlyOverview[0]?.earnings || 0).toLocaleString()}`, icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
    { label: "Platform Fees Paid", value: `₦${totalFees.toLocaleString()}`, icon: ArrowUpRight, color: "bg-red-50 text-red-600" },
  ];

  return (
    <DashboardLayout role="provider" title="Earnings">
      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {/* Summary Cards */}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Transaction History</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No paid bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-right">Net</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 text-sm text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="py-3 text-sm text-slate-700">{t.customer}</td>
                      <td className="py-3 text-sm text-slate-500">{t.service}</td>
                      <td className="py-3 text-sm text-slate-700 text-right">₦{t.amount.toLocaleString()}</td>
                      <td className="py-3 text-sm font-medium text-green-600 text-right">₦{t.net.toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[t.status]}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Automatic Settlement — replaces the old fake "Withdraw Funds" panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-slate-800">Automatic Settlement</h3>
            </div>
            {user?.hasPayoutAccount ? (
              <p className="text-sm text-slate-500">
                Your bank account is connected. Every booking payment splits automatically at checkout —
                your share lands with your bank the same way Paystack/Flutterwave settles any transaction,
                there's no separate withdrawal step to take.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                You haven't added a payout account yet, so booking payments can't reach you automatically.
                Add one under <span className="font-medium text-teal-600">Settings → Payout Settings</span>.
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-3">
                If an automatic split ever fails, or you were paid before adding a payout account, request a
                manual payout below — an admin reviews and sends it directly.
              </p>
              {!showWithdrawForm ? (
                <Button variant="outline" size="sm" onClick={() => setShowWithdrawForm(true)} className="rounded-lg">
                  Request Manual Payout
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Amount (₦)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="rounded-lg h-10 text-sm"
                  />
                  <Input
                    placeholder="Note for the admin (optional)"
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    className="rounded-lg h-10 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={submittingWithdraw} onClick={submitWithdrawal} className="bg-teal-500 hover:bg-teal-600 rounded-lg">
                      {submittingWithdraw ? "Submitting..." : "Submit Request"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowWithdrawForm(false)} className="rounded-lg">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {withdrawals.length > 0 && (
                <div className="mt-4 space-y-2">
                  {withdrawals.map((w) => (
                    <div key={w._id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">₦{w.amount.toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        w.status === "success" ? "bg-green-100 text-green-700" :
                        w.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {w.status === "success" ? "Paid" : w.status === "failed" ? "Declined" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Overview */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Overview</h3>
            {monthlyOverview.length === 0 ? (
              <p className="text-sm text-slate-400">No earnings recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {monthlyOverview.map((m) => (
                  <div key={m.month} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{m.month}</p>
                      <p className="text-xs text-slate-400">{m.jobs} job{m.jobs === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">₦{m.earnings.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
