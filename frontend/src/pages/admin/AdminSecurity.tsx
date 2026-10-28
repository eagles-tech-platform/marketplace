import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { adminApi, ApiError, type LoginAttemptItem } from "@/lib/api";

export default function AdminSecurity() {
  const [attempts, setAttempts] = useState<LoginAttemptItem[]>([]);
  const [suspiciousIps, setSuspiciousIps] = useState<{ ip: string; failedAttempts: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  useEffect(() => {
    adminApi
      .loginActivity()
      .then((res) => {
        setAttempts(res.attempts);
        setSuspiciousIps(res.suspiciousIps);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load login activity."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = attempts.filter((a) => {
    if (filter === "success") return a.success;
    if (filter === "failed") return !a.success;
    return true;
  });

  return (
    <DashboardLayout role="admin" title="Login Activity">
      <p className="text-slate-500 mb-6">Recent login attempts across the platform, most recent first</p>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {suspiciousIps.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Flagged IPs — 5+ failed attempts recently</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {suspiciousIps.map((s) => (
              <span key={s.ip} className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">
                {s.ip || "unknown IP"} — {s.failedAttempts} failed
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(["all", "success", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-teal-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6">Loading login activity...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Result</th>
                  <th className="px-6 py-3 font-medium">IP</th>
                  <th className="px-6 py-3 font-medium">Device</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a._id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3 text-sm text-slate-700">{a.email}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${a.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {a.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {a.reason.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">{a.ip || "—"}</td>
                    <td className="px-6 py-3 text-xs text-slate-400 max-w-xs truncate">{a.userAgent || "—"}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No login activity in this category.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
