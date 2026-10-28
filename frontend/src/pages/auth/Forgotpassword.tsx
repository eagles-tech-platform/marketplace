import { useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSent(res.message);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell heading="Forgot your password?" blurb="It happens. Enter your email and we'll send you a link to set a new one.">
      {sent ? (
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
            <Mail className="w-7 h-7 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Check your email</h1>
          <p className="text-slate-500 text-sm mb-6">{sent} The link expires soon, so use it right away.</p>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => setSent(null)}
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Reset password</h1>
          <p className="text-slate-500 text-sm mb-6">We'll email you a reset link.</p>
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
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12 hover:opacity-90 transition-opacity"
            >
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </>
      )}

      <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
    </AuthShell>
  );
}