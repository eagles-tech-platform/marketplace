import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";

type ProtectedRouteProps = {
  /** Which role(s) may access this section. "admin" also matches isAdmin
   * accounts regardless of their activeRole, same as the backend's own check. */
  allow: Array<"customer" | "provider" | "admin">;
};

/**
 * Guards a group of nested routes. Renders nothing conclusive until the
 * backend has actually answered `/api/auth/me` (useAuth's underlying
 * query) — this is a real server-verified check, not just "is there a
 * cookie in the browser," which is what makes it meaningful as a security
 * boundary rather than a UI nicety.
 */
export default function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const effectiveRole = user.isAdmin ? "admin" : user.activeRole;
  if (!allow.includes(effectiveRole)) {
    // Logged in, but the wrong role for this section — send them to their
    // own home instead of a bare 403 page.
    const fallback = user.isAdmin ? "/admin" : user.activeRole === "provider" ? "/provider" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
