import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  Menu,
  X,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationApi, ApiError, type NotificationItem } from "@/lib/api";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    notificationApi
      .mine()
      .then((res) => {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      })
      .catch(() => {
        /* silently ignore — bell just shows nothing */
      });
  }, [user]);

  const openNotification = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n._id);
        setNotifications((prev) => prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // non-fatal — still navigate even if marking-read failed
        console.error(err instanceof ApiError ? err.message : err);
      }
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    }
  };

  const isHome = location.pathname === "/";
  const showBg = isScrolled || !isHome;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${showBg
        ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100"
        : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg" />
            </div>
            <div className="flex flex-col">
              <span className={`text-sm text-slate-400 tracking-tight transition-colors ${showBg ? "text-slate-800" : "text-white"
                }`}>
                QUANTUM
              </span>
              <span
                className={`text-xl font-bold tracking-tight transition-colors ${showBg ? "text-slate-800" : "text-white"
                  }`}
              >
                MarketPlace
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Home", path: "/" },
              { label: "About", path: "/about" },
              { label: "Services", path: "/services" },
              { label: "Blog", path: "/blog" },
              { label: "Pricing", path: "/pricing" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === link.path
                  ? showBg
                    ? "text-teal-600 bg-teal-50"
                    : "text-white bg-white/20"
                  : showBg
                    ? "text-slate-600 hover:text-teal-600 hover:bg-slate-50"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {!isLoading && user ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={`relative p-2 rounded-lg transition-colors ${showBg
                      ? "text-slate-600 hover:bg-slate-100"
                      : "text-white/80 hover:bg-white/10"
                      }`}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">Notifications</p>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-slate-400 text-center">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n._id}
                            onClick={() => openNotification(n)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 ${n.isRead ? "text-slate-500" : "text-slate-800 bg-teal-50/40"
                              }`}
                          >
                            <p className="font-medium">{n.title}</p>
                            {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                            <p className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className={`flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-lg transition-colors ${showBg
                      ? "hover:bg-slate-100"
                      : "hover:bg-white/10"
                      }`}
                  >
                    <img
                      src={user.avatar || "/avatar-provider-1.jpg"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border-2 border-teal-500"
                    />
                    <ChevronDown
                      className={`w-4 h-4 transition-colors ${showBg ? "text-slate-500" : "text-white/80"
                        }`}
                    />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">
                          {user.name || "User"}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 capitalize">
                          {user.isAdmin ? "admin" : user.activeRole}
                        </span>
                      </div>

                      {!user.isAdmin && user.activeRole === "customer" && (
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                      )}
                      {!user.isAdmin && user.activeRole === "provider" && (
                        <Link
                          to="/provider"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                      )}
                      {user.isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}

                      <Link
                        to={`/${user.isAdmin ? "admin" : user.activeRole === "provider" ? "provider" : "dashboard"}/settings`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className={`text-sm font-medium ${showBg
                      ? "text-slate-600 hover:text-teal-600"
                      : "text-white hover:text-white hover:bg-white/10"
                      }`}
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-teal-500 to-orange-500 text-white text-sm font-medium rounded-full px-5 hover:opacity-90 transition-opacity">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${showBg
                ? "text-slate-600 hover:bg-slate-100"
                : "text-white hover:bg-white/10"
                }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {[
              { label: "Home", path: "/" },
              { label: "About", path: "/about" },
              { label: "Services", path: "/services" },
              { label: "Blog", path: "/blog" },
              { label: "Pricing", path: "/pricing" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${location.pathname === link.path
                  ? "text-teal-600 bg-teal-50"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full text-sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup" className="block">
                  <Button className="w-full bg-gradient-to-r from-teal-500 to-orange-500 text-white text-sm rounded-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
