import { useEffect, useState } from "react";
import { User, Shield, CreditCard, Save, CheckCircle2, UserCircle, BadgeCheck, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import ImageUploader from "@/components/ImageUploader";
import AvatarUploadButton from "@/components/AvatarUploadButton";
import { verificationApi, paymentApi, authApi, ApiError, type VerificationRequestItem, type Bank, type PaymentGateway, type SessionItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "verified", label: "Get Verified", icon: BadgeCheck },
  { id: "customer", label: "Become Customer", icon: UserCircle },
];

export default function ProviderSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const { user, switchRole, isSwitchingRole, updateAvatar, refresh } = useAuth();

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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

  // --- Verification tab state ---
  const [verification, setVerification] = useState<VerificationRequestItem | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [workImages, setWorkImages] = useState<string[]>([]);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    verificationApi
      .mine()
      .then((res) => setVerification(res.request))
      .catch(() => setVerification(null))
      .finally(() => setLoadingVerification(false));
  }, []);

  const submitVerification = async () => {
    const images = workImages;
    if (images.length === 0) {
      setVerificationError("Add at least one photo link of your past work.");
      return;
    }
    setSubmitting(true);
    setVerificationError(null);
    try {
      const res = await verificationApi.submit({
        workImages: images,
        notes: verificationNotes,
        preferredSlots: preferredSlot ? [new Date(preferredSlot).toISOString()] : [],
      });
      setVerification(res.request);
    } catch (err) {
      setVerificationError(err instanceof ApiError ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const payBadgeFee = async () => {
    if (!verification) return;
    setSubmitting(true);
    setVerificationError(null);
    try {
      const res = await verificationApi.payBadgeFee(verification._id);
      setVerification(res.request);
    } catch (err) {
      setVerificationError(err instanceof ApiError ? err.message : "Could not process payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="provider" title="Settings">
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-24">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-teal-50 text-teal-600 border-l-4 border-l-teal-500" : "text-slate-600 hover:bg-slate-50 border-l-4 border-l-transparent"}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {saved && <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 className="w-4 h-4" />Changes saved!</div>}

          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Provider Profile</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={user?.avatar || "/avatar-provider-1.jpg"} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-teal-500" />
                  <AvatarUploadButton onUploaded={updateAvatar} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.category}{user?.yearsOfExperience ? ` • ${user.yearsOfExperience} yrs exp.` : ""}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label><Input defaultValue="Tunde Bakare" className="rounded-xl h-11" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label><Input defaultValue="tunde@example.com" className="rounded-xl h-11" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label><Input defaultValue="+234 800 123 4567" className="rounded-xl h-11" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label><Input defaultValue="Lagos, Nigeria" className="rounded-xl h-11" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label><textarea defaultValue="Licensed plumber with 10+ years of experience in residential and commercial plumbing." rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Working Hours</label><Input defaultValue="Mon - Sat, 8AM - 6PM" className="rounded-xl h-11" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Skills (comma separated)</label><Input defaultValue="Plumbing, Pipe Fitting, Leak Detection" className="rounded-xl h-11" /></div>
              </div>
              <Button onClick={handleSave} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl"><Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Security Settings</h3>
              <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user?.isEmailVerified ? "bg-green-100" : "bg-yellow-100"}`}>
                  <CheckCircle2 className={`w-5 h-5 ${user?.isEmailVerified ? "text-green-600" : "text-yellow-600"}`} />
                </div>
                <div><p className="font-medium text-slate-800">Email Verification</p><p className="text-xs text-slate-500">{user?.isEmailVerified ? "Your email is verified" : "Not verified yet"}</p></div>
                <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${user?.isEmailVerified ? "text-green-600 bg-green-100" : "text-yellow-600 bg-yellow-100"}`}>
                  {user?.isEmailVerified ? "Verified" : "Unverified"}
                </span>
              </div>

              <div className="p-4 border border-slate-100 rounded-xl">
                <h4 className="font-medium text-slate-800 mb-3">Change Password</h4>
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
                <div>
                  <p className="font-medium text-slate-800">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500">{user?.twoFactorEnabled ? "Enabled — a code is emailed at login" : "Add an extra layer of security"}</p>
                </div>
                <Button onClick={handleToggle2fa} disabled={toggling2fa} variant="outline" size="sm" className="rounded-lg">
                  {toggling2fa ? "..." : user?.twoFactorEnabled ? "Disable" : "Enable"}
                </Button>
              </div>

              <div className="p-4 border border-slate-100 rounded-xl">
                <h4 className="font-medium text-slate-800 mb-3">Active Sessions</h4>
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
          )}

          {activeTab === "payment" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Payout Settings</h3>
              <p className="text-slate-500 text-sm">
                Add your bank account so booking payments can be split automatically — you receive your
                share instantly, the platform fee is deducted at the same time.
              </p>

              {user?.hasPayoutAccount ? (
                <div className="p-4 bg-teal-50 rounded-xl flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-teal-600" />
                  <div>
                    <p className="font-medium text-teal-800">Payout account connected</p>
                    <p className="text-xs text-teal-600">You're set up to receive booking payments.</p>
                  </div>
                </div>
              ) : (
                <PayoutAccountForm />
              )}
            </div>
          )}

          {activeTab === "verified" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Get Verified</h3>
              <p className="text-slate-500 text-sm">
                Since most trades here don't have a formal ID to check, verification works differently:
                you share a few photos of past work, then hop on a short live video call with one of our
                admins. Once approved, a small one-time fee activates your <strong>Verified</strong> badge,
                shown on your profile and every service you list.
              </p>

              {user?.isVerifiedBadge && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3">
                  <BadgeCheck className="w-8 h-8 text-teal-600 shrink-0" />
                  <div>
                    <p className="font-medium text-teal-800">You're a Verified Provider</p>
                    <p className="text-xs text-teal-600">Your badge is live on your services.</p>
                  </div>
                </div>
              )}

              {verificationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{verificationError}</div>
              )}

              {loadingVerification ? (
                <p className="text-sm text-slate-400">Checking your verification status...</p>
              ) : !user?.isVerifiedBadge && !verification ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Photos of past work</label>
                    <ImageUploader urls={workImages} onChange={setWorkImages} max={6} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tell us about the work shown</label>
                    <textarea value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)} rows={3} placeholder="e.g. Kitchen plumbing job, Lekki, 2025" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">A time that works for your video call</label>
                    <Input type="datetime-local" value={preferredSlot} onChange={(e) => setPreferredSlot(e.target.value)} className="rounded-xl h-11" />
                  </div>
                  <Button onClick={submitVerification} disabled={submitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                    {submitting ? "Submitting..." : "Submit for Verification"}
                  </Button>
                </div>
              ) : verification && verification.status !== "approved" ? (
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    {verification.status === "rejected" ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-500" />
                    )}
                    <p className="font-medium text-slate-800 capitalize">{verification.status.replace(/_/g, " ")}</p>
                  </div>
                  {verification.status === "submitted" && (
                    <p className="text-sm text-slate-500">We've received your photos — an admin will schedule your video call soon.</p>
                  )}
                  {verification.status === "call_scheduled" && (
                    <p className="text-sm text-slate-500">
                      Call scheduled for {verification.scheduledCallAt ? new Date(verification.scheduledCallAt).toLocaleString() : "TBC"}.
                      {verification.callMeetingLink && (
                        <> <a href={verification.callMeetingLink} target="_blank" rel="noreferrer" className="text-teal-600 underline">Join link</a></>
                      )}
                    </p>
                  )}
                  {verification.status === "call_completed" && (
                    <p className="text-sm text-slate-500">Your call is done — an admin is reviewing your request.</p>
                  )}
                  {verification.status === "awaiting_payment" && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">You're approved! Pay the badge fee to activate it.</p>
                      <Button onClick={payBadgeFee} disabled={submitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                        {submitting ? "Processing..." : "Pay Badge Fee"}
                      </Button>
                    </div>
                  )}
                  {verification.status === "rejected" && (
                    <p className="text-sm text-slate-500">{verification.adminNotes || "Not approved this time — you can reach out to support for details."}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "customer" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Become a Customer</h3>
              <p className="text-slate-500 text-sm mb-4">Enable customer mode to also hire services from other providers on the platform.</p>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-teal-800">As a dual-role user, you can seamlessly switch between being a service provider and a customer.</p>
              </div>
              <Button onClick={() => switchRole("customer")} disabled={isSwitchingRole} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                {isSwitchingRole ? "Switching..." : "Enable Customer Mode"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function PayoutAccountForm() {
  const [gateway, setGateway] = useState<PaymentGateway>("paystack");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    paymentApi
      .banks(gateway)
      .then((res) => setBanks(res.banks))
      .catch(() => setBanks([])); // e.g. in simulate mode without live keys yet — form still submits fine
  }, [gateway]);

  const handleSubmit = async () => {
    if (!bankCode || !accountNumber) {
      setErrorMessage("Select a bank and enter your account number.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const bankName = banks.find((b) => b.code === bankCode)?.name || "";
      const res = await paymentApi.addPayoutAccount({ gateway, bankCode, bankName, accountNumber });
      setSuccessMessage(res.message);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not add payout account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {errorMessage && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{errorMessage}</div>}
      {successMessage && <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700">{successMessage}</div>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Preferred Gateway</label>
        <select value={gateway} onChange={(e) => { setGateway(e.target.value as PaymentGateway); setBankCode(""); }} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
          <option value="paystack">Paystack</option>
          <option value="flutterwave">Flutterwave</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank</label>
        <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
          <option value="">{banks.length ? "Select your bank" : "No bank list yet (add live gateway keys first)"}</option>
          {banks.map((b) => (<option key={b.code} value={b.code}>{b.name}</option>))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Number</label>
        <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" className="rounded-xl h-11" />
      </div>
      <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
        {submitting ? "Saving..." : "Add Payout Account"}
      </Button>
      <p className="text-xs text-slate-400">
        In test mode (PAYMENTS_MODE=simulate) this saves your details without contacting a real bank —
        good for testing the flow. Once live, this creates a real payout sub-account automatically.
      </p>
    </div>
  );
}
