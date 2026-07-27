import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Search,
  ClipboardList,
  MessageSquare,
  ShoppingCart,
  PenLine,
  Settings,
  LogOut,
  List,
  DollarSign,
  Users,
  CheckSquare,
  CreditCard,
  BookOpen,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Star,
  Wallet,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  role: "customer" | "provider" | "admin";
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const customerLinks = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Browse Services", icon: Search, path: "/dashboard/services" },
  { label: "My Bookings", icon: ClipboardList, path: "/dashboard/bookings" },
  { label: "Get Recommendation", icon: Sparkles, path: "/dashboard/recommendations" },
  { label: "Chat", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Cart", icon: ShoppingCart, path: "/dashboard/cart" },
  { label: "Blog", icon: PenLine, path: "/dashboard/blog" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

const providerLinks = [
  { label: "Overview", icon: LayoutDashboard, path: "/provider" },
  { label: "My Services", icon: List, path: "/provider/services" },
  { label: "Bookings", icon: ClipboardList, path: "/provider/bookings" },
  { label: "Chat", icon: MessageSquare, path: "/provider/chat" },
  { label: "Earnings", icon: DollarSign, path: "/provider/earnings" },
  { label: "Blog", icon: PenLine, path: "/provider/blog" },
  { label: "Settings", icon: Settings, path: "/provider/settings" },
];

const adminLinks = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Reviews", icon: Star, path: "/admin/reviews" },
  { label: "Security", icon: ShieldAlert, path: "/admin/security" },
  { label: "Withdrawals", icon: Wallet, path: "/admin/withdrawals" },
  { label: "Approvals", icon: CheckSquare, path: "/admin/approvals" },
  { label: "Verifications", icon: BadgeCheck, path: "/admin/verifications" },
  { label: "Bookings", icon: ClipboardList, path: "/admin/bookings" },
  { label: "Payments", icon: CreditCard, path: "/admin/payments" },
  { label: "Announcements", icon: MessageCircle, path: "/admin/notifications" },
  { label: "Blog", icon: BookOpen, path: "/admin/blog" },
  { label: "Feedback", icon: MessageCircle, path: "/admin/feedback" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function Sidebar({ role, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const links = role === "customer" ? customerLinks : role === "provider" ? providerLinks : adminLinks;
  const homeLink = role === "customer" ? "/dashboard" : role === "provider" ? "/provider" : "/admin";

  // Handle resize for auto-collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && !collapsed) setCollapsed(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-slate-100 ${collapsed ? "justify-center" : ""}`}>
        <Link to={homeLink} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-lg" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm text-slate-400 tracking-tight">
                QUANTUM
              </span>
              <span className="text-lg font-bold text-slate-800 tracking-tight">
                MarketPlace
              </span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:block hidden"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:block hidden"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <Link
              key={link.path + link.label}
              to={link.path}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-200"
                  : "text-slate-600 hover:bg-teal-50 hover:text-teal-600"
                } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? link.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all w-full ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 z-30 flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"
          }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
