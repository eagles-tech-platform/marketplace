import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";
import AuthShell from "@/components/auth/AuthShell";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const linkIsValid = Boolean(token && email);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // After success, send them to login
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/login"), 2500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (password.length < 8) return setErrorMessage("Password must be at least 8 characters.");
    if (password !== confirm) return setErrorMessage("Passwords do not match.");

    setLoading(true);
    try {
      await authApi.resetPassword(token, email, password);
      setDone(true);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell heading="Choose a new password" blurb="Pick something strong that you don't use anywhere else.">
      {!linkIsValid ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link is incomplete</h1>
          <p className="text-slate-500 text-sm mb-6">
            This reset link is missing information. Request a new one and use the link from the latest email.
          </p>
          <Link to="/forgot-password">
            <Button className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12">
              Request a new link
            </Button>
          </Link>
        </div>
      ) : done ? (
        <div className="text-center">
          <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Password updated</h1>
          <p className="text-slate-500 text-sm mb-6">Taking you to sign in...</p>
          <Link to="/login" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            Go to sign in now
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Set new password</h1>
          <p className="text-slate-500 text-sm mb-6">
            For <span className="font-medium">{email}</span>
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            {errorMessage && (
              <div className="text-sm text-red-600">
                <p>{errorMessage}</p>
                {/expired|invalid/i.test(errorMessage) && (
                  <Link to="/forgot-password" className="underline font-medium">
                    Request a new link
                  </Link>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12 hover:opacity-90 transition-opacity"
            >
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}