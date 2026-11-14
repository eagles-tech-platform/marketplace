import { useEffect, useMemo, useState } from "react";
import {
  Check,
  BadgeCheck,
  Gift,
  CreditCard,
  RefreshCw,
  XCircle,
  Clock3,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import {
  subscriptionApi,
  type MySubscription,
  type SubscriptionPlan,
  type SubscriptionAudience,
  type BillingInterval,
  type SubscriptionGateway,
  type SubscriptionPayment,
  type BillingCapabilities,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const INTERVALS: {
  value: BillingInterval;
  label: string;
  suffix: string;
}[] = [
    { value: "monthly", label: "Monthly", suffix: "mo" },
    { value: "quarterly", label: "Quarterly", suffix: "3 mo" },
    { value: "annual", label: "Annual", suffix: "yr" },
  ];

const ACTIVE_STATUSES = [
  "active",
  "founding_free",
  "non_renewing",
  "past_due",
];

function formatPrice(value: unknown, currency: string): string {
  const amount = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) {
    return "Price unavailable";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "NGN"} ${amount.toLocaleString()}`;
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if ( typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

function statusLabel(status?: string): string {
  if (!status) return "No subscription";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPlanId(plan: SubscriptionPlan): string {
  const candidate = plan as SubscriptionPlan & { _id?: string; id?: string };
  return String(candidate.id ?? candidate._id ?? "");
}

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currency, setCurrency] = useState("NGN");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [audience, setAudience] = useState<SubscriptionAudience>("customer");
  const [gateway, setGateway] = useState<SubscriptionGateway>("paystack");
  const [subscriptions, setSubscriptions] = useState<MySubscription[]>([]);
  const [foundingStatus, setFoundingStatus] = useState<{ claimed: number; totalSlots: number; remaining: number; } | null>(null);
  const [capabilities, setCapabilities] = useState<BillingCapabilities | null>(null);
  const [history, setHistory] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const canCustomer = Boolean(user?.canBeCustomer);
  const canProvider = Boolean(user?.canBeProvider);

  const availableAudiences = useMemo(() => {
    const values: SubscriptionAudience[] = [];
    if (canCustomer) values.push("customer");
    if (canProvider) values.push("provider");

    // Older account payloads may not expose the capability flags.
    if (values.length === 0 && isAuthenticated) {
      values.push(
        user?.activeRole === "provider" ? "provider" : "customer",
      );
    }

    return values;
  }, [canCustomer, canProvider, isAuthenticated, user?.activeRole]);

  const mySub = subscriptions.find((item) => item.audience === audience) ?? null;
  const isFoundingFree = mySub?.status === "founding_free";
  const recurringEnabled = Boolean(capabilities?.recurringEnabled && capabilities.mode === "live",);
  const selectedGateway = capabilities?.gateways?.[gateway];
  const gatewayEnabled = Boolean(selectedGateway?.enabled);
  const gatewayCurrencyAllowed = gateway === "flutterwave" || Boolean(capabilities?.gateways?.paystack?.currencies?.includes(currency),);
  const canCheckout = recurringEnabled && gatewayEnabled && gatewayCurrencyAllowed;
  const eligiblePlans = plans.filter((plan) => plan.role === "both" || plan.role === audience,);

  useEffect(() => {
    if (
      availableAudiences.length > 0 &&
      !availableAudiences.includes(audience)
    ) {
      setAudience(
        user?.activeRole === "provider" &&
          availableAudiences.includes("provider")
          ? "provider"
          : availableAudiences[0],
      );
    }
  }, [availableAudiences, audience, user?.activeRole]);

  useEffect(() => {
    let alive = true;

    async function loadPricingData() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [planRes, foundingRes, capabilityRes, mineRes, historyRes] =
          await Promise.all([
            subscriptionApi.plans(user?.state),
            subscriptionApi.foundingStatus(),
            subscriptionApi.capabilities(),
            isAuthenticated
              ? subscriptionApi.mine()
              : Promise.resolve({
                subscriptions: [] as MySubscription[],
                subscription: null as MySubscription | null,
              }),
            isAuthenticated
              ? subscriptionApi.history()
              : Promise.resolve({ payments: [] as SubscriptionPayment[] }),
          ]);

        if (!alive) return;

        setPlans(planRes.plans ?? []);
        setCurrency(planRes.currency || "NGN");
        setFoundingStatus(foundingRes);
        setCapabilities(capabilityRes);

        const mine = mineRes.subscriptions?.length
          ? mineRes.subscriptions
          : mineRes.subscription
            ? [mineRes.subscription]
            : [];

        setSubscriptions(mine);
        setHistory(historyRes.payments ?? []);
      } catch (error) {
        if (alive) {
          setErrorMessage(
            getErrorMessage(
              error,
              "Could not load subscription information. Please try again.",
            ),
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadPricingData();

    return () => {
      alive = false;
    };
  }, [user?.state, isAuthenticated]);

  const refreshSubscriptionData = async () => {
    const [mineRes, historyRes] = await Promise.all([
      subscriptionApi.mine(),
      subscriptionApi.history(),
    ]);

    const mine = mineRes.subscriptions?.length
      ? mineRes.subscriptions
      : mineRes.subscription
        ? [mineRes.subscription]
        : [];

    setSubscriptions(mine);
    setHistory(historyRes.payments ?? []);
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      window.location.assign("/login");
      return;
    }
    if (!planId) {
      setErrorMessage("This plan is missing its plan ID. Please refresh and try again.");
      return;
    }
    if (!consent) {
      setErrorMessage( "Please confirm the recurring billing authorization before continuing.",);
      return;
    }
    if (!canCheckout) {
      setErrorMessage(
        capabilities?.mode === "simulate"
          ? "Recurring subscriptions are unavailable while the backend is in simulate mode."
          : "The selected payment gateway is not enabled for recurring billing in this currency.",
      );
      return;
    }
    setSubscribing(planId);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const result = await subscriptionApi.subscribe({
        planId,
        interval,
        gateway,
        audience,
        consent: true,
      });

      if (!result.checkoutUrl) {
        throw new Error(
          "The server did not return a checkout link. Please contact support before trying again.",
        );
      }

      // The subscription remains pending until the backend verifies the gateway callback.
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Could not initialize subscription checkout."),
      );
      setSubscribing(null);
    }
  };

  const handleCancel = async (subscription: MySubscription) => {
    if (!subscription?._id) return;
    const confirmed = window.confirm(
      "Cancel automatic renewal for this subscription? Your paid access may remain active until the current period ends.",
    );
    if (!confirmed) return;
    setManaging(subscription._id);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const result = await subscriptionApi.cancel(subscription._id);
      setNoticeMessage(
        result.message || "Your cancellation request was processed.",
      );
      await refreshSubscriptionData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Could not cancel this subscription."),
      );
    } finally {
      setManaging(null);
    }
  };

  const handleRetry = async (subscription: MySubscription) => {
    if (!subscription?._id) return;

    setManaging(subscription._id);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const result = await subscriptionApi.retry(subscription._id);
      setNoticeMessage(
        result.message || "Your renewal retry has been queued.",
      );
      await refreshSubscriptionData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Could not queue the renewal retry."),
      );
    } finally {
      setManaging(null);
    }
  };

  const getPriceForPlan = (plan: SubscriptionPlan): number | null => {
    const candidate = plan as SubscriptionPlan & {
      prices?: Partial<Record<BillingInterval, number | string | null>>;
      priceNgnMonthly?: number;
      priceNgnQuarterly?: number;
      priceNgnYearly?: number;
      priceUsdMonthly?: number;
      priceUsdQuarterly?: number;
      priceUsdYearly?: number;
    };

    const normalized = candidate.prices?.[interval];
    if (normalized !== undefined && normalized !== null && normalized !== "") {
      const amount = Number(normalized);
      return Number.isFinite(amount) && amount > 0 ? amount : null;
    }

    const suffix =
      interval === "monthly"
        ? "Monthly"
        : interval === "quarterly"
          ? "Quarterly"
          : "Yearly";

    const key = `${currency === "USD" ? "priceUsd" : "priceNgn"}${suffix}` as
      | "priceNgnMonthly"
      | "priceNgnQuarterly"
      | "priceNgnYearly"
      | "priceUsdMonthly"
      | "priceUsdQuarterly"
      | "priceUsdYearly";

    const amount = Number(candidate[key]);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  };

  const gatewayMessage = !gatewayEnabled
    ? `${gateway === "paystack" ? "Paystack" : "Flutterwave"} recurring billing is not enabled.`
    : !gatewayCurrencyAllowed
      ? `Paystack recurring billing is not enabled for ${currency}.`
      : "You will complete payment on the selected provider's secure checkout page.";

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500 pb-16 pt-28">
        <div className="mx-auto max-w-5xl px-4 text-center text-white sm:px-6 lg:px-8">
          <h1 className="mb-3 text-3xl font-bold lg:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="text-white/80">
            Plans and prices are based on your account location.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {foundingStatus && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Gift className="h-5 w-5 text-teal-600" />
              Founding Member availability
            </div>
            <p className="mt-1">
              {foundingStatus.remaining} of {foundingStatus.totalSlots} founding
              places remaining.
            </p>
          </div>
        )}

        {isFoundingFree && mySub && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <Gift className="h-6 w-6 shrink-0 text-teal-600" />
            <div>
              <p className="font-medium text-teal-800">
                You&apos;re a Founding Member (#
                {mySub.foundingMemberNumber ?? "—"})
              </p>
              <p className="text-sm text-teal-700">
                Free until{" "}
                {mySub.freeUntil
                  ? new Date(mySub.freeUntil).toLocaleDateString()
                  : "—"}{" "}
                — no subscription charge until then.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {noticeMessage && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
          >
            {noticeMessage}
          </div>
        )}

        {availableAudiences.length > 1 && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              {availableAudiences.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAudience(value);
                    setConsent(false);
                    setErrorMessage(null);
                  }}
                  aria-pressed={audience === value}
                  className={`rounded-full px-6 py-2 text-sm font-medium capitalize transition-colors ${audience === value
                    ? "bg-teal-500 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {value} membership
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-center">
          <div className="inline-flex flex-wrap justify-center rounded-full border border-slate-200 bg-white p-1">
            {INTERVALS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setInterval(item.value);
                  setConsent(false);
                  setErrorMessage(null);
                }}
                aria-pressed={interval === item.value}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${interval === item.value
                  ? "bg-teal-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>



        <div className="mb-10 flex flex-col items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Choose your payment method
          </label>

          <div className="relative w-full max-w-sm">
            <button
              type="button"
              onClick={() => setGatewayOpen((previous) => !previous)}
              aria-haspopup="listbox"
              aria-expanded={gatewayOpen}
              className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3.5 text-sm font-medium shadow-sm transition-all duration-200 ${gatewayOpen
                ? "border-teal-500 ring-4 ring-teal-500/10"
                : "border-slate-200 hover:border-teal-400"
                }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <CreditCard className="h-5 w-5" />
                </span>

                <span className="text-left">
                  <span className="block text-slate-800">
                    {gateway === "paystack" ? "Paystack" : "Flutterwave"}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    Secure payment gateway
                  </span>
                </span>
              </span>

              <ChevronDown
                className={`h-5 w-5 text-teal-600 transition-transform duration-200 ${gatewayOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {gatewayOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close payment method menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setGatewayOpen(false)}
                />

                <div
                  role="listbox"
                  aria-label="Payment gateway"
                  className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {([
                    { value: "paystack", name: "Paystack" },
                    { value: "flutterwave", name: "Flutterwave" },
                  ] as const).map((option) => {
                    const selected = gateway === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setGateway(option.value);
                          setGatewayOpen(false);
                          setErrorMessage(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-150 ${selected
                          ? "bg-teal-50 text-teal-700"
                          : "text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected
                              ? "bg-teal-100 text-teal-700"
                              : "bg-slate-100 text-slate-500"
                              }`}
                          >
                            <CreditCard className="h-5 w-5" />
                          </span>

                          <span>
                            <span className="block text-sm font-semibold">
                              {option.name}
                            </span>
                            <span className="block text-xs text-slate-400">
                              Secure payment
                            </span>
                          </span>
                        </span>

                        {selected && (
                          <Check className="h-5 w-5 text-teal-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500">
            Prices shown in{" "}
            <span className="font-semibold text-slate-700">{currency}</span>.
            {" "}{gatewayMessage}
          </p>
        </div>



        {capabilities?.mode === "simulate" && (
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Recurring subscriptions are disabled while the backend is in
            simulate mode. Plans remain visible, but checkout is unavailable
            until live billing is configured.
          </div>
        )}

        {capabilities && !recurringEnabled && capabilities.mode !== "simulate" && (
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Recurring billing is not currently available. Please try again
            later or contact support.
          </div>
        )}

        {isAuthenticated && (
          <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                I authorize recurring subscription billing for the selected
                plan and interval. I understand that renewal charges may be
                collected automatically until I cancel, subject to the
                subscription terms.
              </span>
            </label>
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-slate-400">
            Loading plans...
          </p>
        ) : eligiblePlans.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            No subscription plans are currently available for this account
            type.
          </p>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {eligiblePlans.map((plan) => {
              const planId = getPlanId(plan);
              const price = getPriceForPlan(plan);
              const hasPrice = price !== null;
              const isCurrent =
                mySub?.plan?.tier === plan.tier &&
                ACTIVE_STATUSES.includes(mySub.status);
              const isPopular = plan.tier === "pro";

              return (
                <article
                  key={planId || plan.name}
                  className={`rounded-2xl border-2 bg-white p-8 ${isPopular
                    ? "border-teal-500 shadow-lg"
                    : "border-slate-100"
                    }`}
                >
                  {isPopular && (
                    <span className="mb-3 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                      Most Popular
                    </span>
                  )}

                  <h2 className="mb-1 text-xl font-bold text-slate-800">
                    {plan.name}
                  </h2>

                  <p className="mb-1 text-3xl font-bold text-slate-800">
                    {hasPrice
                      ? formatPrice(price, currency)
                      : "Price unavailable"}
                    <span className="text-sm font-normal text-slate-400">
                      /
                      {INTERVALS.find((item) => item.value === interval)?.suffix}
                    </span>
                  </p>

                  <p className="mb-5 text-xs text-slate-400">
                    {interval === "quarterly"
                      ? "Billed every 3 months"
                      : interval === "annual"
                        ? "Billed once per year"
                        : "Billed every month"}
                  </p>

                  <ul className="mb-6 space-y-2">
                    {(plan.features ?? []).map((feature, index) => (
                      <li
                        key={`${planId}-${index}`}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {!isAuthenticated ? (
                    <Button
                      onClick={() => window.location.assign("/login")}
                      className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-orange-500 text-white"
                    >
                      Log In to Subscribe
                    </Button>
                  ) : isCurrent ? (
                    <Button
                      disabled
                      className="w-full rounded-xl"
                      variant="outline"
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      {statusLabel(mySub?.status)}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void handleSubscribe(planId)}
                      disabled={
                        !hasPrice ||
                        !planId ||
                        !canCheckout ||
                        !consent ||
                        subscribing === planId
                      }
                      className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-orange-500 text-white"
                    >
                      {subscribing === planId
                        ? "Opening secure checkout..."
                        : isFoundingFree
                          ? "Switch Plan"
                          : "Continue to Payment"}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {isAuthenticated && mySub && (
          <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Your {audience} subscription
              </h2>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Status:</span>
                <strong className="ml-1">{statusLabel(mySub.status)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Gateway:</span>
                <strong className="ml-1 capitalize">
                  {mySub.gateway || "—"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Billing:</span>
                <strong className="ml-1 capitalize">
                  {mySub.interval || "—"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Current period ends:</span>
                <strong className="ml-1">
                  {mySub.currentPeriodEnd
                    ? new Date(mySub.currentPeriodEnd).toLocaleDateString()
                    : "—"}
                </strong>
              </div>
            </div>

            {mySub.status === "past_due" && (
              <div className="mt-5">
                <Button
                  onClick={() => void handleRetry(mySub)}
                  disabled={managing === mySub._id}
                  className="rounded-xl"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {managing === mySub._id
                    ? "Requesting..."
                    : "Retry renewal"}
                </Button>
              </div>
            )}

            {["active", "past_due", "pending"].includes(mySub.status) && (
              <div className="mt-5">
                <Button
                  onClick={() => void handleCancel(mySub)}
                  disabled={managing === mySub._id}
                  variant="outline"
                  className="rounded-xl"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {managing === mySub._id
                    ? "Processing..."
                    : "Cancel renewal"}
                </Button>
                {mySub.gateway === "flutterwave" && (
                  <p className="mt-2 text-xs text-slate-500">
                    If direct cancellation is not supported by the gateway,
                    follow the instructions returned by the server.
                  </p>
                )}
              </div>
            )}

            {mySub.status === "non_renewing" && (
              <p className="mt-4 flex items-center gap-2 text-sm text-amber-700">
                <Clock3 className="h-4 w-4" />
                Renewal is stopped; access remains until the current paid
                period ends.
              </p>
            )}
          </section>
        )}

        {isAuthenticated && history.length > 0 && (
          <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Billing history
            </h2>
            <div className="divide-y divide-slate-100">
              {history.slice(0, 10).map((payment) => (
                <div
                  key={payment._id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-700">
                      {payment.reference}
                    </p>
                    <p className="text-xs text-slate-500">
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleString()
                        : "Date unavailable"}{" "}
                      · {payment.provider}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">
                      {formatPrice(payment.amount, payment.currency)}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
