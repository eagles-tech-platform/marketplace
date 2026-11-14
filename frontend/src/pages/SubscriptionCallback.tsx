
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";

export default function SubscriptionCallback() {
  const [searchParams] = useSearchParams();

  const status = searchParams.get("status")?.toLowerCase();
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");

  const cancelled = status === "cancelled";
  const successful = status === "successful" || status === "completed";

  const title = cancelled
    ? "Payment Cancelled"
    : successful
      ? "Payment Received"
      : "Payment Verification";

  const description = cancelled
    ? "You cancelled the payment process. No subscription activation has been confirmed."
    : successful
      ? "Your payment provider has returned a successful status. Your subscription still needs to be verified."
      : "Your payment status is being checked. Please do not attempt another payment until you confirm the transaction status.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          {cancelled ? (
            <XCircle className="h-9 w-9 text-red-500" />
          ) : successful ? (
            <CheckCircle2 className="h-9 w-9 text-teal-600" />
          ) : (
            <Clock className="h-9 w-9 text-amber-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {description}
        </p>

        {txRef && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transaction reference
            </p>
            <p className="mt-1 break-all font-mono text-xs text-slate-700">
              {txRef}
            </p>
          </div>
        )}

        {transactionId && (
          <p className="mt-3 break-all text-xs text-slate-500">
            Transaction ID: {transactionId}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {cancelled ? "Return to Pricing" : "View Subscription"}
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