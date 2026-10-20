import { Navigate, Outlet, useLocation } from "react-router";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import { gateDecision } from "@/lib/nativeGate";

const native = Capacitor.isNativePlatform();

/**
 * In the mobile app, every screen except sign in, sign up, password help and the legal pages needs a signed-in user.
 * On the website this does nothing. Wrap all routes in it (see APPLY.md).
 */
export default function NativeGate() {
  const { user, isLoading } = useAuth();
  const { pathname, search } = useLocation();
  const decision = gateDecision({ native, loading: isLoading, loggedIn: !!user, pathname });

  if (decision === "wait") {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  }
  if (decision === "login") {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(pathname + search)}`} replace />;
  }
  if (decision === "home") {
    const to = user?.isAdmin ? "/admin" : user?.activeRole === "provider" ? "/provider" : "/dashboard";
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}
