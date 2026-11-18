import { useState } from "react";
import { Link } from "react-router";
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

          {/* Payment (still sample data) */}
          {activeTab === "payment" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Payment Methods</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">**** **** **** 4532</p>
                      <p className="text-xs text-slate-500">Expires 09/27</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Default</span>
                </div>
                <Button variant="outline" className="w-full rounded-xl border-dashed border-2 py-6">
                  + Add New Payment Method
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-medium text-slate-800 mb-3">Payment History</h4>
                <div className="space-y-2">
                  {[
                    { service: "Plumbing Repair", amount: 5000, date: "Jan 12, 2026", status: "Success" },
                    { service: "Home Cleaning", amount: 15000, date: "Jan 8, 2026", status: "Success" },
                    { service: "AC Repair", amount: 12000, date: "Jan 5, 2026", status: "Success" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{p.service}</p>
                        <p className="text-xs text-slate-400">{p.date}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">N{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

          {/* Feedback is managed in the dedicated Support Centre. */}
          {activeTab === "feedback" && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">Customer Support Centre</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Submit feedback, report bugs, raise account or payment concerns, and track replies from the Marketplace team in one place.</p>
                  <Link to="/dashboard/support" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800">Open Support Centre</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}