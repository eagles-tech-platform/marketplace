import { useEffect, useState } from "react";
import { BadgeCheck, Clock, CheckCircle2, XCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { verificationApi, ApiError, type VerificationRequestItem } from "@/lib/api";

export default function AdminVerifications() {
  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [callInputs, setCallInputs] = useState<Record<string, { time: string; link: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await verificationApi.list();
      setRequests(res.requests);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load verification requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateOne = (updated: VerificationRequestItem) => {
    setRequests((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
  };

  const scheduleCall = async (id: string) => {
    const input = callInputs[id];
    if (!input?.time) {
      setErrorMessage("Pick a call time first.");
      return;
    }
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await verificationApi.scheduleCall(id, new Date(input.time).toISOString(), input.link);
      updateOne(res.request);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not schedule call.");
    } finally {
      setBusyId(null);
    }
  };

  const completeCall = async (id: string) => {
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await verificationApi.completeCall(id);
      updateOne(res.request);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update call status.");
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    const adminNotes = decision === "reject" ? window.prompt("Reason for rejection (shown to the provider):") || "" : "";
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await verificationApi.decide(id, decision, adminNotes, true); // require badge fee before activation
      updateOne(res.request);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not record decision.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => !["approved", "rejected"].includes(r.status));
  const resolved = requests.filter((r) => ["approved", "rejected"].includes(r.status));

  return (
    <DashboardLayout role="admin" title="Provider Verifications">
      <div className="mb-6">
        <p className="text-slate-500">
          Review portfolio photos, schedule the live video call, then approve or reject ({pending.length} in progress)
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading requests...</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-slate-400 mb-8">No verification requests in progress.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 mb-10">
          {pending.map((req) => {
            const providerInfo = typeof req.provider === "object" ? req.provider : null;
            return (
              <div key={req._id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800">{providerInfo?.name || "Provider"}</h4>
                    <p className="text-sm text-slate-500">{providerInfo?.email}</p>
                    {providerInfo?.category && (
                      <p className="text-xs text-slate-400">{providerInfo.category} · {providerInfo.niche}</p>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                    {req.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto">
                  {req.workImages.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 bg-slate-100" />
                  ))}
                </div>
                {req.notes && <p className="text-sm text-slate-600">{req.notes}</p>}

                {req.status === "submitted" && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Schedule video call</p>
                    <Input
                      type="datetime-local"
                      className="rounded-lg h-10 text-sm"
                      value={callInputs[req._id]?.time || ""}
                      onChange={(e) => setCallInputs((prev) => ({ ...prev, [req._id]: { ...prev[req._id], time: e.target.value } }))}
                    />
                    <Input
                      placeholder="Meeting link (Google Meet, Zoom...)"
                      className="rounded-lg h-10 text-sm"
                      value={callInputs[req._id]?.link || ""}
                      onChange={(e) => setCallInputs((prev) => ({ ...prev, [req._id]: { ...prev[req._id], link: e.target.value } }))}
                    />
                    <Button size="sm" disabled={busyId === req._id} onClick={() => scheduleCall(req._id)} className="bg-teal-600 text-white rounded-lg">
                      Schedule Call
                    </Button>
                  </div>
                )}

                {req.status === "call_scheduled" && (
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {req.scheduledCallAt ? new Date(req.scheduledCallAt).toLocaleString() : "TBC"}
                    </p>
                    <Button size="sm" disabled={busyId === req._id} onClick={() => completeCall(req._id)} variant="outline" className="rounded-lg">
                      Mark Call Done
                    </Button>
                  </div>
                )}

                {req.status === "call_completed" && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === req._id} onClick={() => decide(req._id, "approve")} className="bg-green-600 text-white rounded-lg flex-1">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" disabled={busyId === req._id} onClick={() => decide(req._id, "reject")} variant="outline" className="rounded-lg flex-1 text-red-600 border-red-200">
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {req.status === "awaiting_payment" && (
                  <p className="text-sm text-slate-500">Approved — waiting on the provider to pay the badge fee.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">Resolved</h3>
          <div className="grid lg:grid-cols-2 gap-3">
            {resolved.map((req) => {
              const providerInfo = typeof req.provider === "object" ? req.provider : null;
              return (
                <div key={req._id} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {req.status === "approved" ? (
                      <BadgeCheck className="w-5 h-5 text-teal-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-slate-700">{providerInfo?.name || "Provider"}</span>
                  </div>
                  <span className="text-xs text-slate-400 capitalize">{req.status}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
