import { useEffect, useState } from "react";
import { Check, BadgeCheck, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { subscriptionApi, ApiError, type MySubscription } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type Plan = { id: string; name: string; tier: string; features: string[]; priceMonthly: number; priceYearly: number };

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currency, setCurrency] = useState("NGN");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [mySub, setMySub] = useState<MySubscription>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    subscriptionApi
      .plans(user?.state)
      .then((res) => {
        setPlans(res.plans);
        setCurrency(res.currency);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load plans."))
      .finally(() => setLoading(false));

    if (isAuthenticated) {
      subscriptionApi.mine().then((res) => setMySub(res.subscription)).catch(() => setMySub(null));
    }
  }, [user?.state, isAuthenticated]);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    setErrorMessage(null);
    try {
      await subscriptionApi.subscribe({ planId, interval, gateway: "paystack" });
      const res = await subscriptionApi.mine();
      setMySub(res.subscription);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not subscribe.");
    } finally {
      setSubscribing(null);
    }
  };

  const symbol = currency === "NGN" ? "₦" : "$";
  const isFoundingFree = mySub?.status === "founding_free";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="relative pt-28 pb-16 bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">Simple, transparent pricing</h1>
          <p className="text-white/80">Prices shown in {currency} based on your location.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isFoundingFree && mySub && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-8 flex items-center gap-3">
            <Gift className="w-6 h-6 text-teal-600 shrink-0" />
            <div>
              <p className="font-medium text-teal-800">You're a Founding Member (#{mySub.foundingMemberNumber})</p>
              <p className="text-sm text-teal-600">
                Free until {mySub.freeUntil ? new Date(mySub.freeUntil).toLocaleDateString() : "—"} — no subscription charge until then.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
        )}

        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-full p-1 border border-slate-200 inline-flex">
            {(["monthly", "yearly"] as const).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-6 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                  interval === iv ? "bg-teal-500 text-white" : "text-slate-600"
                }`}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-sm text-slate-400">Loading plans...</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan) => {
              const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const isCurrent = mySub?.plan?.tier === plan.tier && mySub?.status === "active";
              return (
                <div key={plan.id} className={`bg-white rounded-2xl p-8 border-2 ${plan.tier === "pro" ? "border-teal-500 shadow-lg" : "border-slate-100"}`}>
                  {plan.tier === "pro" && (
                    <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">Most Popular</span>
                  )}
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
                  <p className="text-3xl font-bold text-slate-800 mb-4">
                    {symbol}{price.toLocaleString()}
                    <span className="text-sm font-normal text-slate-400">/{interval === "yearly" ? "yr" : "mo"}</span>
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isAuthenticated ? (
                    <Button onClick={() => (window.location.href = "/login")} className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                      Log In to Subscribe
                    </Button>
                  ) : isCurrent ? (
                    <Button disabled className="w-full rounded-xl" variant="outline">
                      <BadgeCheck className="w-4 h-4 mr-2" /> Current Plan
                    </Button>
                  ) : (
                    <Button onClick={() => handleSubscribe(plan.id)} disabled={subscribing === plan.id} className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                      {subscribing === plan.id ? "Processing..." : isFoundingFree ? "Switch Plan Now" : "Subscribe"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
