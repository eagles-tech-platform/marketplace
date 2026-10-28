import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi, ApiError } from "@/lib/api";
import AuthShell from "@/components/auth/AuthShell";

type Status = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // The token is single-use. React StrictMode runs effects twice in dev,
  // so without this guard the 2nd call fails and overwrites the success state.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token || !email) {
      setStatus("error");
      setMessage("This verification link is incomplete.");
      return;
    }
    authApi
      .verifyEmail(token, email)
      .then((res) => {
        setMessage(res.message);
        setStatus("success");
      })
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : "Could not verify your email. Please try again.");
        setStatus("error");
      });
  }, [token, email]);

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
    <AuthShell heading="Verifying your email" blurb="One quick step and your account is ready to use.">
      <div className="text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-14 h-14 mx-auto mb-4 text-teal-600 animate-spin" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifying...</h1>
            <p className="text-slate-500 text-sm">Hang on while we confirm your email.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-teal-600" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Email verified</h1>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12">
                Sign in
              </Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Verification failed</h1>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            {email && (
              <Button
                type="button"
                onClick={handleResend}
                className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white font-semibold rounded-xl h-12 mb-3"
              >
                Send a new verification email
              </Button>
            )}
            {resendStatus && <p className="text-sm text-slate-600 mb-3">{resendStatus}</p>}
            <Link to="/login" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}