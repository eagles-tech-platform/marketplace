import { useEffect, useState } from "react";
import { User, Shield, CheckCircle2, Lock, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import AvatarUploadButton from "@/components/AvatarUploadButton";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError, type SessionItem } from "@/lib/api";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
];

export default function AdminSettings() {
  const { user, updateAvatar, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

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

  return (
    <DashboardLayout role="admin" title="Settings">
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "bg-teal-50 text-teal-600 border-l-4 border-l-teal-500" : "text-slate-600 hover:bg-slate-50 border-l-4 border-l-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Admin Profile</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={user?.avatar || "/avatar-provider-1.jpg"} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-teal-500" />
                  <AvatarUploadButton onUploaded={updateAvatar} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Administrator</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                There's only ever one admin account by design — created once via the bootstrap script, never through the app itself.
              </p>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Security Settings</h3>
              <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user?.isEmailVerified ? "bg-green-100" : "bg-yellow-100"}`}>
                  <CheckCircle2 className={`w-5 h-5 ${user?.isEmailVerified ? "text-green-600" : "text-yellow-600"}`} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Email Verification</p>
                  <p className="text-xs text-slate-500">{user?.isEmailVerified ? "Your email is verified" : "Not verified yet"}</p>
                </div>
                <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${user?.isEmailVerified ? "text-green-600 bg-green-100" : "text-yellow-600 bg-yellow-100"}`}>
                  {user?.isEmailVerified ? "Verified" : "Unverified"}
                </span>
              </div>

              <div className="p-4 border border-slate-100 rounded-xl">
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Change Password
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  If you're still using the password from the one-time bootstrap script, change it now.
                </p>
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
                    <p className="text-xs text-slate-500">{user?.twoFactorEnabled ? "Enabled — a code is emailed at login" : "Strongly recommended for the admin account"}</p>
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
