import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, HardHat, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { adminApi, ApiError, type AuthUser } from "@/lib/api";

export default function AdminApprovals() {
  const [apps, setApps] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.providerApplications("pending");
      setApps(res.applications);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    setErrorMessage(null);
    try {
      await adminApi.decideProviderApplication(id, decision);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not process decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout role="admin" title="Provider Approvals">
      <div className="mb-6">
        <p className="text-slate-500">Review and approve provider applications ({apps.length} pending)</p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading applications...</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {apps.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <img src={app.avatar || "/avatar-provider-1.jpg"} alt="" className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">{app.name}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${app.hasPayoutAccount ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {app.hasPayoutAccount ? "Payout Ready" : "No Payout Account"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{app.email}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {app.state && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.state}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">{app.category || "Not specified"}</span>
                  {app.niche && <span className="text-xs text-slate-400">→ {app.niche}</span>}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => decide(app.id, "approve")} disabled={busyId === app.id} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button onClick={() => decide(app.id, "reject")} disabled={busyId === app.id} variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && apps.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-500">All applications have been reviewed!</p>
        </div>
      )}
    </DashboardLayout>
  );
}
