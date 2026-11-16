import { useEffect, useState } from "react";
import {
  User,
  Shield,
  CreditCard,
  HardHat,
  MessageSquare,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/auth/DashboardLayout";
import ProfileTab from "@/components/auth/Profiletab"
import SecurityTab from "@/components/auth/Securitytab";
import { jobCategories } from "@/data/categories";
import { feedbackApi, paymentApi, ApiError, type FeedbackItem } from "@/lib/api";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "provider", label: "Become a Provider", icon: HardHat },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
];

export default function CustomerSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [providerCategory, setProviderCategory] = useState("");
  const [providerNiche, setProviderNiche] = useState("");
  const [saved, setSaved] = useState(false);

  const currentCat = jobCategories.find((c) => c.name === providerCategory);

  // NOTE: still a placeholder for the provider-application and notification tabs
  // (no backend endpoints for them yet).
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [feedbackType, setFeedbackType] = useState("General Feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    feedbackApi.mine().then((res) => setMyFeedback(res.feedback)).catch(() => setMyFeedback([]));
  }, []);

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      setFeedbackError("Please write a message first.");
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      const res = await feedbackApi.create({ subject: feedbackType, message: feedbackMessage.trim() });
      setMyFeedback((prev) => [res.feedback, ...prev]);
      setFeedbackMessage("");
    } catch (err) {
      setFeedbackError(err instanceof ApiError ? err.message : "Could not send feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="customer" title="Settings">
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Settings Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-24">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-teal-50 text-teal-600 border-l-4 border-l-teal-500"
                    : "text-slate-600 hover:bg-slate-50 border-l-4 border-l-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {saved && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Changes saved successfully!
            </div>
          )}

          {activeTab === "profile" && (
            <ProfileTab
              title="Profile Settings"
              fallbackAvatar="/avatar-customer-1.jpg"
              header={
                <>
                  <p className="font-medium text-slate-800">Profile Photo</p>
                  <p className="text-sm text-slate-500">JPG, PNG. Max 2MB</p>
                </>
              }
            />
          )}

          {activeTab === "security" && <SecurityTab />}

          {/* Payments — gateway-hosted checkout; card details are never stored by this app. */}
          {activeTab === "payment" && <CustomerPaymentHistory />}

          {/* Become a Provider */}
          {activeTab === "provider" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Become a Service Provider</h3>
              <p className="text-slate-500 text-sm">Offer your skills and earn money on MarketPlace. Fill in the details below to apply.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Category</label>
                  <select
                    value={providerCategory}
                    onChange={(e) => { setProviderCategory(e.target.value); setProviderNiche(""); }}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                  >
                    <option value="">Select a category</option>
                    {jobCategories.map((cat) => (
                      <option key={cat.slug} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {currentCat && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Niche ({currentCat.niches.length} options)</label>
                    <select
                      value={providerNiche}
                      onChange={(e) => setProviderNiche(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                    >
                      <option value="">Select your niche</option>
                      {currentCat.niches.map((niche) => (
                        <option key={niche.slug} value={niche.name}>{niche.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of Experience</label>
                  <select className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none">
                    <option>Select</option>
                    {["Less than 1 year", "1-2 years", "3-5 years", "5-10 years", "10+ years"].map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium mb-1">Provider Slot Fee: N5,000</p>
                  <p className="text-xs text-amber-600">One-time payment to start offering services. Subject to admin approval.</p>
                </div>

                <Button onClick={handleSave} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                  Submit Application
                </Button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Notification Preferences</h3>
              {[
                { label: "Booking Updates", desc: "Get notified when your booking status changes", defaultOn: true },
                { label: "New Messages", desc: "Receive notifications for new chat messages", defaultOn: true },
                { label: "Promotions", desc: "Receive special offers and promotions", defaultOn: false },
                { label: "Payment Alerts", desc: "Get notified about payments and refunds", defaultOn: true },
                { label: "Blog Updates", desc: "Notifications about new blog posts", defaultOn: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500" />
                  </label>
                </div>
              ))}
              <Button onClick={handleSave} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl mt-4">
                Save Preferences
              </Button>
            </div>
          )}

          {/* Feedback */}
          {activeTab === "feedback" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Send Feedback</h3>
              {feedbackError && <p className="text-sm text-red-600">{feedbackError}</p>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Feedback Type</label>
                <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none">
                  <option>General Feedback</option>
                  <option>Bug Report</option>
                  <option>Feature Request</option>
                  <option>Complaint</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none resize-none"
                />
              </div>
              <Button onClick={handleSendFeedback} disabled={feedbackSubmitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                {feedbackSubmitting ? "Sending..." : "Send Feedback"}
              </Button>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-medium text-slate-800 mb-3">Previous Feedback</h4>
                {myFeedback.length === 0 ? (
                  <p className="text-sm text-slate-400">No feedback sent yet.</p>
                ) : (
                  <div className="space-y-3">
                    {myFeedback.map((item) => (
                      <div key={item._id} className="p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{item.subject}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            item.status === "closed" ? "text-green-600 bg-green-100" :
                            item.status === "replied" ? "text-blue-600 bg-blue-100" : "text-yellow-600 bg-yellow-100"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{item.message}</p>
                        {item.adminReply && (
                          <p className="text-xs text-teal-700 mt-2 pl-2 border-l-2 border-teal-200">{item.adminReply}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function CustomerPaymentHistory() {
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof paymentApi.mine>>["payments"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentApi.mine()
      .then((result) => setPayments(result.payments))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load payment history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Payments</h3>
        <p className="mt-1 text-sm text-slate-500">
          Payments are securely completed through the available payment gateway. Marketplace does not store your full card details.
        </p>
      </div>

      <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <div>
            <p className="text-sm font-medium text-teal-900">Secure checkout</p>
            <p className="mt-1 text-xs text-teal-800">
              Choose Paystack or Flutterwave when you pay for a booking or another Marketplace service. Your gateway handles card and bank authorization.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-slate-800">Payment history</h4>
        {loading ? (
          <p className="py-6 text-sm text-slate-400">Loading payments…</p>
        ) : error ? (
          <p className="py-6 text-sm text-red-600">{error}</p>
        ) : payments.length === 0 ? (
          <p className="py-6 text-sm text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {payments.map((payment) => (
              <div key={payment._id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {payment.serviceTitle || payment.purpose.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-400">
                    {payment.provider.toUpperCase()} · {new Date(payment.createdAt).toLocaleString()}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <span className="text-sm font-semibold text-slate-800">
                    {payment.currency === "NGN" ? "₦" : `${payment.currency} `}{payment.amount.toLocaleString()}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    payment.status === "success" ? "bg-emerald-50 text-emerald-700" :
                    payment.status === "pending" ? "bg-amber-50 text-amber-700" :
                    "bg-rose-50 text-rose-700"
                  }`}>{payment.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
