import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // 2FA step
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (res.requiresTwoFactor) {
        setNeedsOtp(true);
        setLoading(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate(returnUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.code === "EMAIL_NOT_VERIFIED") setNeedsVerification(true);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await authApi.verifyTwoFactor(email, otp);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate(returnUrl);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus(null);
    try {
      const res = await authApi.resendVerification(email);
      setResendStatus(res.message);
    } catch (err) {
      setResendStatus(err instanceof ApiError ? err.message : "Could not resend verification email.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative flex flex-col justify-center items-center text-white p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <span className="text-white font-sans font-bold text-3xl">Qm</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-white/80 max-w-sm">
            Sign in to access your dashboard, manage bookings, and connect with service providers.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-light  text-slate-600">QUANTUM</span>
                <span className="text-2xl font-bold text-slate-800">MarketPlace</span>
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            {needsOtp ? (
              <>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Enter your code</h1>
                <p className="text-slate-500 text-sm mb-6">
                  We sent a 6-digit code to <span className="font-medium">{email}</span>.
                </p>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 text-center tracking-[0.5em] text-lg"
                    required
                  />
                  {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12 hover:opacity-90 transition-opacity"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Sign In</h1>
                <p className="text-slate-500 text-sm mb-6">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-teal-600 font-medium hover:text-teal-700">
                    Sign up
                  </Link>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                  {needsVerification && (
                    <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
                      <p>Your email isn't verified yet.</p>
                      <button type="button" onClick={handleResend} className="font-medium underline mt-1">
                        Resend verification email
                      </button>
                      {resendStatus && <p className="mt-1 text-orange-600">{resendStatus}</p>}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" className="rounded border-slate-300 text-teal-500 focus:ring-teal-200" />
                      Remember me
                    </label>
                    <Link to="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12 hover:opacity-90 transition-opacity"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
