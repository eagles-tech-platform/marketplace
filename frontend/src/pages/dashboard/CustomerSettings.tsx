import { useEffect, useState } from "react";
import {
  User,
  Shield,
  CreditCard,
  HardHat,
  MessageSquare,
  Bell,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarUploadButton from "@/components/AvatarUploadButton";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import { jobCategories } from "@/data/categories";
import { feedbackApi, authApi, ApiError, type FeedbackItem, type SessionItem } from "@/lib/api";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "provider", label: "Become a Provider", icon: HardHat },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
];

export default function CustomerSettings() {
  const { user, updateAvatar, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [providerCategory, setProviderCategory] = useState("");
  const [providerNiche, setProviderNiche] = useState("");
  const [saved, setSaved] = useState(false);

  const currentCat = jobCategories.find((c) => c.name === providerCategory);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [feedbackType, setFeedbackType] = useState("General Feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);

  // --- Security tab state ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [toggling2fa, setToggling2fa] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    authApi.sessions().then((res) => setSessions(res.sessions)).catch(() => setSessions([]));
  }, []);

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Could not change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggle2fa = async () => {
    setToggling2fa(true);
    try {
      await authApi.toggleTwoFactor();
      await refresh();
    } finally {
      setToggling2fa(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    const previous = sessions;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await authApi.revokeSession(id);
    } catch {
      setSessions(previous);
    }
  };

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

          {/* Profile */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Profile Settings</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={user?.avatar || "/avatar-customer-1.jpg"} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-teal-500" />
                  <AvatarUploadButton onUploaded={updateAvatar} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Profile Photo</p>
                  <p className="text-sm text-slate-500">JPG, PNG. Max 2MB</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <Input defaultValue="Chioma Okafor" className="rounded-xl h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <Input defaultValue="chioma@example.com" className="rounded-xl h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                  <Input defaultValue="+234 800 123 4567" className="rounded-xl h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                  <Input defaultValue="Lagos, Nigeria" className="rounded-xl h-11" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                  <textarea
                    defaultValue="Looking for reliable service providers for my home and office needs."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none resize-none"
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user?.isEmailVerified ? "bg-green-100" : "bg-yellow-100"}`}>
                      <CheckCircle2 className={`w-5 h-5 ${user?.isEmailVerified ? "text-green-600" : "text-yellow-600"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">Email Verification</p>
                      <p className="text-xs text-slate-500">{user?.isEmailVerified ? "Your email is verified" : "Not verified yet"}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${user?.isEmailVerified ? "text-green-600 bg-green-100" : "text-yellow-600 bg-yellow-100"}`}>
                    {user?.isEmailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>

                <div className="p-4 border border-slate-100 rounded-xl">
                  <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </h4>
                  {passwordError && <p className="text-sm text-red-600 mb-2">{passwordError}</p>}
                  {passwordSuccess && <p className="text-sm text-green-600 mb-2">{passwordSuccess}</p>}
                  <div className="space-y-3">
                    <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl h-11" />
                    <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl h-11" />
                    <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl h-11" />
                    <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="rounded-xl">
                      {changingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-800">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-500">{user?.twoFactorEnabled ? "Enabled — a code is emailed at login" : "Add an extra layer of security"}</p>
                    </div>
                  </div>
                  <Button onClick={handleToggle2fa} disabled={toggling2fa} variant="outline" size="sm" className="rounded-lg">
                    {toggling2fa ? "..." : user?.twoFactorEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>

                <div className="p-4 border border-slate-100 rounded-xl">
                  <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Active Sessions
                  </h4>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-slate-400">No active sessions found.</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {s.userAgent.slice(0, 60) || "Unknown device"} {s.isCurrent && <span className="text-teal-600">(this device)</span>}
                            </p>
                            <p className="text-xs text-slate-400">{s.ip} · last active {new Date(s.lastSeenAt).toLocaleString()}</p>
                          </div>
                          {!s.isCurrent && (
                            <Button onClick={() => handleRevokeSession(s.id)} size="sm" variant="outline" className="rounded-lg text-xs text-red-600 border-red-200 hover:bg-red-50">
                              Sign out
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
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
