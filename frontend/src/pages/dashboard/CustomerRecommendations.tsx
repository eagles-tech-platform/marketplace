import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Sparkles, BadgeCheck, Star, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import { jobCategories } from "@/data/categories";
import { nigerianStates, internationalCountries } from "@/data/locations";
import { recommendationApi, paymentApi, ApiError, type RecommendationRequestItem } from "@/lib/api";

export default function CustomerRecommendations() {
  const [requests, setRequests] = useState<RecommendationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [niche, setNiche] = useState("");
  const [state, setState] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const currentCat = jobCategories.find((c) => c.name === category);

  const load = async () => {
    setLoading(true);
    try {
      const res = await recommendationApi.mine();
      setRequests(res.requests);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load your requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!category || !niche) {
      setErrorMessage("Category and niche are required.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await recommendationApi.create({
        category,
        niche,
        state,
        budget: budget ? Number(budget) : undefined,
        notes,
      });
      setRequests((prev) => [res.request, ...prev]);
      setShowForm(false);
      setCategory("");
      setNiche("");
      setState("");
      setBudget("");
      setNotes("");
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not create request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (request: RecommendationRequestItem) => {
    setPayingId(request._id);
    setErrorMessage(null);
    try {
      const res = await paymentApi.initialize({
        purpose: "recommendation_fee",
        gateway: "paystack",
        recommendationRequestId: request._id,
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      // simulate mode — matching already ran server-side, refresh to see results
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not start payment.");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <DashboardLayout role="customer" title="Get a Recommendation">
      <div className="bg-gradient-to-br from-teal-500 to-orange-500 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">Not sure who to book?</h3>
        </div>
        <p className="text-white/90 text-sm mb-4">
          Tell us what you need — we'll match you with the best-fit approved providers, ranked by rating,
          verification, and location, for a small one-time fee.
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-white text-teal-700 hover:bg-white/90 rounded-full">
            Request a Match
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">What do you need?</h3>
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setNiche(""); }} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                <option value="">Select</option>
                {jobCategories.map((cat) => (<option key={cat.slug} value={cat.name}>{cat.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Niche</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                <option value="">Select</option>
                {currentCat?.niches.map((n) => (<option key={n.slug} value={n.name}>{n.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Location (optional)</label>
              <select value={state} onChange={(e) => setState(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 bg-white">
                <option value="">Any location</option>
                <optgroup label="Nigeria">
                  {nigerianStates.map((s) => (<option key={s} value={s}>{s}</option>))}
                </optgroup>
                <optgroup label="International">
                  {internationalCountries.map((c) => (<option key={c} value={c}>{c}</option>))}
                </optgroup>
              </select>
              <p className="text-xs text-slate-400 mt-1">Matching a provider in your location gets ranked higher.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Budget (₦, optional)</label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 20000" className="rounded-xl h-11" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Anything else? (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Describe what you need..." className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
              {submitting ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading your requests...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-slate-400">No recommendation requests yet.</p>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => (
            <div key={req._id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-slate-800">{req.niche}</h4>
                  <p className="text-sm text-slate-500">{req.category}{req.state ? ` · ${req.state}` : ""}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${req.status === "matched" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {req.status === "matched" ? "Matched" : "Awaiting Payment"}
                </span>
              </div>

              {req.status === "pending_payment" ? (
                <Button onClick={() => handlePay(req)} disabled={payingId === req._id} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                  {payingId === req._id ? "Processing..." : "Pay to Get Matched"}
                </Button>
              ) : req.matchedProviders.length === 0 ? (
                <p className="text-sm text-slate-400">No approved providers found for this category/niche yet — check back soon.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {req.matchedProviders.map((m) => (
                    <Link
                      key={m.provider._id}
                      to={`/services?category=${encodeURIComponent(req.category)}`}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <img src={m.provider.avatar || "/avatar-provider-1.jpg"} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{m.provider.name}</p>
                          {m.provider.isVerifiedBadge && <BadgeCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {(m.provider.ratingCount || 0) > 0 && (
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{m.provider.ratingAvg}</span>
                          )}
                          {(m.provider.city || m.provider.state) && (
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{m.provider.city || m.provider.state}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
