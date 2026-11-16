import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { paymentApi, type PaymentItem } from "@/lib/api";

type ResultState = "checking" | "success" | "pending" | "not_paid" | "failed" | "refunded" | "error";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<ResultState>("checking");
  const [payment, setPayment] = useState<PaymentItem | null>(null);
  const [message, setMessage] = useState("Checking your payment directly with the payment provider...");

  const reference = searchParams.get("reference") || searchParams.get("tx_ref");
  const callbackStatus = searchParams.get("status")?.toLowerCase() || "";

  useEffect(() => {
    let alive = true;

    async function verify() {
      if (!reference) {
        setResult("error");
        setMessage("The payment reference is missing. Please contact support if money was deducted.");
        return;
      }

      try {
        const response = await paymentApi.verify(reference, callbackStatus);
        if (!alive) return;
        setPayment(response.payment);
        setResult(response.payment.status);
        if (response.payment.status === "success") {
          setMessage("Your payment has been verified successfully.");
        } else if (response.payment.status === "not_paid") {
          setMessage("The payment was cancelled or abandoned. It has been recorded as not paid.");
        } else if (response.payment.status === "failed") {
          setMessage("The payment provider reported that this payment failed.");
        } else if (response.payment.status === "refunded") {
          setMessage("This payment was refunded.");
        } else {
          setMessage("Your payment is still pending. We will only mark it as paid after the provider confirms it.");
        }
      } catch {
        if (!alive) return;
        setResult("pending");
        setMessage("We could not confirm the final result yet. Please check your payment history before trying again.");
      }
    }

    void verify();
    return () => { alive = false; };
  }, [reference, callbackStatus]);

  const success = result === "success";
  const unpaid = result === "not_paid" || result === "failed" || result === "refunded";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          {result === "checking" ? (
            <Loader2 className="h-9 w-9 animate-spin text-teal-600" />
          ) : success ? (
            <CheckCircle2 className="h-9 w-9 text-teal-600" />
          ) : unpaid ? (
            <XCircle className="h-9 w-9 text-red-500" />
          ) : (
            <Clock className="h-9 w-9 text-amber-500" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {result === "checking" ? "Verifying Payment" : success ? "Payment Successful" : result === "not_paid" ? "Payment Not Completed" : result === "failed" ? "Payment Failed" : result === "refunded" ? "Payment Refunded" : result === "error" ? "Unable to Verify Payment" : "Payment Pending"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        {payment && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
            <p className="mt-1 font-semibold text-slate-800">
              {new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency || "NGN" }).format(payment.amount)}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-700">{payment.reference}</p>
          </div>
        )}
        <div className="mt-7 flex flex-col gap-3">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
            Continue to Marketplace
          </Link>
          <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
