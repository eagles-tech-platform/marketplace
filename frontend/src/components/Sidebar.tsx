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
  BadgeCheck,
  Star,
  Wallet,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Role = "customer" | "provider" | "admin";

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

export function AppSidebar({ role }: { role: Role }) {
  const location = useLocation();
  const { logout } = useAuth();

  const links =
    role === "customer" ? customerLinks : role === "provider" ? providerLinks : adminLinks;
  const homeLink = role === "customer" ? "/dashboard" : role === "provider" ? "/provider" : "/admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to={homeLink} className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-lg" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm text-slate-400 tracking-tight leading-none">
              QUANTUM
            </span>
            <span className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
              MarketPlace
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <SidebarMenuItem key={link.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={link.label}
                      className={
                        isActive
                          ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-200 hover:from-teal-500 hover:to-teal-600 hover:text-white data-[active=true]:bg-gradient-to-r data-[active=true]:from-teal-500 data-[active=true]:to-teal-600 data-[active=true]:text-white"
                          : "text-slate-600 hover:bg-teal-50 hover:text-teal-600"
                      }
                    >
                      <Link to={link.path}>
                        <Icon className="w-5 h-5 shrink-0" />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              tooltip="Logout"
              className="text-red-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}