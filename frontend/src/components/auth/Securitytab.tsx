import { useEffect, useState } from "react";
import { CheckCircle2, Lock, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError, type SessionItem } from "@/lib/api";

type Props = {
  /** Small helper text under the "Change Password" heading (e.g. admin bootstrap warning). */
  passwordHint?: string;
  /** Text shown under 2FA when it is switched off. */
  twoFactorOffText?: string;
};

/** Security tab shared by the customer, provider and admin settings pages. */
export default function SecurityTab({ passwordHint, twoFactorOffText = "Add an extra layer of security" }: Props) {
  const { user, refresh } = useAuth();

  // --- Change password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // --- 2FA ---
  const [toggling2fa, setToggling2fa] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  // --- Email verification ---
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // --- Sessions ---
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    authApi.sessions().then((res) => setSessions(res.sessions)).catch(() => setSessions([]));
  }, []);

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
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
    setTwoFaError(null);
    setToggling2fa(true);
    try {
      await authApi.toggleTwoFactor();
      await refresh();
    } catch (err) {
      setTwoFaError(err instanceof ApiError ? err.message : "Could not update two-factor settings.");
    } finally {
      setToggling2fa(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendStatus(null);
    try {
      const res = await authApi.resendVerification(user.email);
      setResendStatus(res.message);
    } catch (err) {
      setResendStatus(err instanceof ApiError ? err.message : "Could not resend verification email.");
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
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Security Settings</h3>

      {/* Email verification */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-3">
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
        {!user?.isEmailVerified && (
          <div className="mt-3">
            <button type="button" onClick={handleResendVerification} className="text-sm text-teal-600 underline font-medium">
              Resend verification email
            </button>
            {resendStatus && <p className="text-xs text-slate-500 mt-1">{resendStatus}</p>}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="p-4 border border-slate-100 rounded-xl">
        <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Change Password
        </h4>
        {passwordHint && <p className="text-xs text-slate-400 mb-3">{passwordHint}</p>}
        {passwordError && <p className="text-sm text-red-600 mb-2">{passwordError}</p>}
        {passwordSuccess && <p className="text-sm text-green-600 mb-2">{passwordSuccess}</p>}
        <div className="space-y-3">
          <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" className="rounded-xl h-11" />
          <Input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className="rounded-xl h-11" />
          <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="rounded-xl h-11" />
          <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword} variant="outline" className="rounded-xl">
            {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* 2FA */}
      <div className="p-4 border border-slate-100 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-800">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">{user?.twoFactorEnabled ? "Enabled — a code is emailed at login" : twoFactorOffText}</p>
            </div>
          </div>
          <Button onClick={handleToggle2fa} disabled={toggling2fa} variant="outline" size="sm" className="rounded-lg">
            {toggling2fa ? "..." : user?.twoFactorEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
        {twoFaError && <p className="text-sm text-red-600 mt-2">{twoFaError}</p>}
      </div>

      {/* Sessions */}
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
              <div key={s.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {s.userAgent.slice(0, 60) || "Unknown device"} {s.isCurrent && <span className="text-teal-600">(this device)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{s.ip} · last active {new Date(s.lastSeenAt).toLocaleString()}</p>
                </div>
                {!s.isCurrent && (
                  <Button onClick={() => handleRevokeSession(s.id)} size="sm" variant="outline" className="rounded-lg text-xs text-red-600 border-red-200 hover:bg-red-50 shrink-0">
                    Sign out
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}