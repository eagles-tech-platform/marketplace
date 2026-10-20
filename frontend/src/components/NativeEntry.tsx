import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export default function NativeEntry() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  const to = user.isAdmin ? "/admin" : user.activeRole === "provider" ? "/provider" : "/dashboard";
  return <Navigate to={to} replace />;
}