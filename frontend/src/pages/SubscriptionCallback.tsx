import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { subscriptionApi } from "@/lib/api";

type ResultState = "checking" | "success" | "pending" | "not_paid" | "failed" | "error";

export default function SubscriptionCallback() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<ResultState>("checking");
  const [message, setMessage] = useState("Checking your payment directly with the payment provider...");

  const txRef = searchParams.get("tx_ref") || searchParams.get("reference");
  const transactionId = searchParams.get("transaction_id") || undefined;
  const callbackStatus = searchParams.get("status")?.toLowerCase() || "";

  useEffect(() => {
    let alive = true;

    async function verify() {
      if (!txRef) {
        setResult("error");
        setMessage("The payment reference is missing. Please check your billing history or contact support.");
        return;
      }

      try {
        const response = await subscriptionApi.verify(
          txRef,
          transactionId,
          callbackStatus,
        );
        if (!alive) return;

        setResult(response.status);
        if (response.status === "success") {
          setMessage("Your payment has been verified and your subscription is active.");
        } else if (response.status === "not_paid") {
          setMessage("The payment was cancelled or abandoned. No subscription charge was confirmed and your subscription was not activated.");
        } else if (response.status === "failed") {
          setMessage("The payment provider reported that this payment failed. Your subscription has not been activated.");
        } else {
          setMessage("The payment is still pending. Your subscription will only activate after the payment provider confirms the transaction.");
        }
      } catch {
        if (!alive) return;
        setResult("pending");
        setMessage("We could not confirm the final result yet. Your payment remains pending until the provider can be checked again. Please check your billing history before trying again.");
      }
    }

    void verify();
    return () => { alive = false; };
  }, [txRef, transactionId, callbackStatus]);

  const success = result === "success";
  const notPaid = result === "not_paid" || result === "failed";
  const title = result === "checking"
    ? "Verifying Payment"
    : success
      ? "Payment Successful"
      : result === "not_paid"
        ? "Payment Not Completed"
        : result === "failed"
          ? "Payment Failed"
          : result === "error"
            ? "Unable to Verify Payment"
            : "Payment Pending";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          {result === "checking" ? (
            <Loader2 className="h-9 w-9 animate-spin text-teal-600" />
          ) : success ? (
            <CheckCircle2 className="h-9 w-9 text-teal-600" />
          ) : notPaid ? (
            <XCircle className="h-9 w-9 text-red-500" />
          ) : (
            <Clock className="h-9 w-9 text-amber-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>

        {txRef && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transaction reference
            </p>
            <p className="mt-1 break-all font-mono text-xs text-slate-700">{txRef}</p>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {success ? "View Subscription" : "Return to Pricing"}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
