import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ShoppingCart, XCircle, ArrowRight, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/auth/DashboardLayout";
import { bookingApi, paymentApi, ApiError, type BookingItem, type PaymentGateway } from "@/lib/api";

export default function CustomerCart() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentGateway>("paystack");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.mine();
      setItems(res.bookings.filter((b) => !b.isTrialBooking && b.paymentStatus === "unpaid" && b.status !== "cancelled"));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load your cart.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const removeItem = async (booking: BookingItem) => {
    if (!window.confirm(`Cancel this booking for "${booking.service.title}"? It will be removed from your cart.`)) return;
    setBusyId(booking._id);
    try {
      await bookingApi.updateStatus(booking._id, "cancelled");
      setItems((prev) => prev.filter((i) => i._id !== booking._id));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not cancel booking.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    setErrorMessage(null);
    try {
      // Each booking has its own provider (and payout split), so each is
      // its own transaction — pay them one at a time.
      for (const item of items) {
        const res = await paymentApi.initialize({ purpose: "booking_payment", gateway: paymentMethod, bookingId: item._id });
        if (res.checkoutUrl) {
          // Live mode: send them to the gateway for this item; remaining
          // items stay in the cart to pay after this one completes.
          window.location.href = res.checkoutUrl;
          return;
        }
      }
      // Simulate mode — everything resolved instantly
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not complete checkout.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="customer" title="Cart">
        <p className="text-sm text-slate-400 text-center py-10">Loading your cart...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer" title="Cart">
      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Nothing to pay for right now</h3>
          <p className="text-slate-500 mb-6">Unpaid bookings show up here — browse services to book one.</p>
          <Link to="/dashboard/services">
            <Button className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full">
              Browse Services
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Unpaid Bookings ({items.length})
              </h3>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <img src={item.service.images?.[0] || "/provider-work.jpg"} alt="" className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{item.service.title}</h4>
                      <p className="text-sm text-slate-500">{item.provider.name}</p>
                      <p className="text-lg font-bold text-teal-600 mt-1">₦{item.price.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item)}
                      disabled={busyId === item._id}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Cancel booking"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Method</h3>
              <div className="space-y-3">
                {[
                  { id: "paystack" as const, name: "Paystack", desc: "Pay with card, bank, or USSD", icon: CreditCard },
                  { id: "flutterwave" as const, name: "Flutterwave", desc: "Card, bank transfer, mobile money", icon: Smartphone },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === method.id ? "border-teal-500 bg-teal-50" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      paymentMethod === method.id ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      <method.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{method.name}</p>
                      <p className="text-xs text-slate-500">{method.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Bank transfer isn't self-service yet — contact support to arrange one.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Order Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</span>
                  <span className="text-slate-700">₦{total.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="font-bold text-xl text-teal-600">₦{total.toLocaleString()}</span>
                </div>
              </div>
              <Button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl py-6 hover:opacity-90"
              >
                {checkingOut ? "Processing..." : "Proceed to Checkout"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-slate-400 text-center mt-3">
                Secure payment powered by {paymentMethod === "paystack" ? "Paystack" : "Flutterwave"}
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
