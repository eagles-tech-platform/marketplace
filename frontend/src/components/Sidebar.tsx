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
  Megaphone,
  BadgeCheck,
  Star,
  Wallet,
  Sparkles,
  ShieldAlert,
  PanelLeftOpen,
  LifeBuoy, 
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type Role = "customer" | "provider" | "admin";

const LINKS: Record<Role, { label: string; icon: React.ElementType; path: string }[]> = {
  customer: [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Browse Services", icon: Search, path: "/dashboard/services" },
    { label: "My Bookings", icon: ClipboardList, path: "/dashboard/bookings" },
    { label: "Get Recommendation", icon: Sparkles, path: "/dashboard/recommendations" },
    { label: "Chat", icon: MessageSquare, path: "/dashboard/chat" },
    { label: "Cart", icon: ShoppingCart, path: "/dashboard/cart" },
    { label: "Blog", icon: PenLine, path: "/dashboard/blog" },
    { label: "Settings", icon: Settings, path: "/dashboard/settings" },
  ],
  provider: [
    { label: "Overview", icon: LayoutDashboard, path: "/provider" },
    { label: "My Services", icon: List, path: "/provider/services" },
    { label: "Bookings", icon: ClipboardList, path: "/provider/bookings" },
    { label: "Chat", icon: MessageSquare, path: "/provider/chat" },
    { label: "Earnings", icon: DollarSign, path: "/provider/earnings" },
    { label: "Blog", icon: PenLine, path: "/provider/blog" },
    { label: "Settings", icon: Settings, path: "/provider/settings" },
  ],
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Reviews", icon: Star, path: "/admin/reviews" },
    { label: "Security", icon: ShieldAlert, path: "/admin/security" },
    { label: "Withdrawals", icon: Wallet, path: "/admin/withdrawals" },
    { label: "Approvals", icon: CheckSquare, path: "/admin/approvals" },
    { label: "Verifications", icon: BadgeCheck, path: "/admin/verifications" },
    { label: "Bookings", icon: ClipboardList, path: "/admin/bookings" },
    { label: "Payments", icon: CreditCard, path: "/admin/payments" },
    { label: "Announcements", icon: Megaphone, path: "/admin/notifications" },
    { label: "Blog", icon: BookOpen, path: "/admin/blog" },
    { label: "Feedback", icon: MessageCircle, path: "/admin/feedback" },
    { label: "Support", icon: LifeBuoy, path: "/admin/support" }, 
    { label: "Settings", icon: Settings, path: "/admin/settings" },
  ],
};

export function AppSidebar({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { toggleSidebar, setOpenMobile } = useSidebar();

  const links = LINKS[role];
  const homeLink = links[0].path;

  // The root link (e.g. /dashboard) must match exactly, otherwise it would
  // be highlighted on every nested page. Other links also match sub-routes
  // (e.g. /dashboard/services/123 keeps "Browse Services" active).
  const isActive = (path: string) =>
    path === homeLink
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            to={homeLink}
            onClick={() => setOpenMobile(false)}
            className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden"
          >
            <img src="/logo.png" alt="Quantum MarketPlace logo" className="h-7 w-7 shrink-0 rounded-lg" />
            <div className="flex flex-col">
              <span className="text-sm leading-none tracking-tight text-sidebar-foreground/60">
                QUANTUM
              </span>
              <span className="text-lg font-bold leading-tight tracking-tight text-sidebar-foreground">
                MarketPlace
              </span>
            </div>
          </Link>

          {/* Collapsed state: logo doubles as the expand button */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="group/logo relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:flex"
          >
            <img
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain rounded-lg transition-opacity group-hover/logo:opacity-0"
            />
            <PanelLeftOpen className="absolute h-4 w-4 text-sidebar-foreground opacity-0 transition-opacity group-hover/logo:opacity-100" />
          </button>

          <SidebarTrigger className="hidden shrink-0 md:flex group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map(({ label, icon: Icon, path }) => {
                const active = isActive(path);
                return (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className={
                        active
                          ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-200/40 hover:from-teal-500 hover:to-teal-600 hover:text-white data-[active=true]:bg-gradient-to-r data-[active=true]:from-teal-500 data-[active=true]:to-teal-600 data-[active=true]:text-white"
                          : "text-sidebar-foreground/70 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40"
                      }
                    >
                      <Link to={path} onClick={() => setOpenMobile(false)}>
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{label}</span>
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
              onClick={() => logout()}
              tooltip="Logout"
              className="text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}