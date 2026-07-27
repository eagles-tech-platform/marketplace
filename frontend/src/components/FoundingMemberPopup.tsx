import { useEffect, useState } from "react";
import { Link } from "react-router";
import { X, Sparkles } from "lucide-react";
import { subscriptionApi, ApiError, type FoundingStatus } from "@/lib/api";

const DISMISSED_KEY = "founding_popup_dismissed";

export default function FoundingMemberPopup() {
  const [status, setStatus] = useState<FoundingStatus | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    subscriptionApi
      .foundingStatus()
      .then((res) => {
        if (res.remaining > 0) {
          setStatus(res);
          // Small delay so it feels like a hook, not a wall the moment the page loads.
          setTimeout(() => setVisible(true), 1500);
        }
      })
      .catch((err) => {
        if (!(err instanceof ApiError)) console.error(err);
      });
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible || !status) return null;

  const inFirstTier = status.firstTierRemaining > 0;
  const spotsLeft = inFirstTier ? status.firstTierRemaining : status.remaining;
  const freeMonths = inFirstTier ? 6 : 2;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={dismiss}>
      <div
        className="bg-white rounded-2xl max-w-md w-full p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={dismiss} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Only {spotsLeft.toLocaleString()} founding spots left
        </h2>
        <p className="text-slate-500 mb-6">
          The first {status.firstTierLimit} people to join get {freeMonths} months completely free —
          {inFirstTier ? " you're inside that window right now." : ` after that, the next ${status.secondTierLimit - status.firstTierLimit} still get 2 months free.`}
        </p>

        <div className="flex gap-3">
          <Link to="/signup" onClick={dismiss} className="flex-1">
            <button className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity">
              Claim My Spot
            </button>
          </Link>
          <button onClick={dismiss} className="px-4 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
