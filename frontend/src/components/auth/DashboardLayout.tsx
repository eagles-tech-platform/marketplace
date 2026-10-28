// import { useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "../Sidebar";
import { SidebarInset,
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import NotificationBell from "../NotificationBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "customer" | "provider" | "admin";
  title: string;
}

export default function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset className="bg-slate-50">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1 md:hidden" />
              <Separator orientation="vertical" className="h-4" />
              <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-3 py-2 gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 w-48"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
               <NotificationBell />
              </div>

              {/* Profile */}
              <Link
                to={`/${role === "provider" ? "provider" : role === "admin" ? "admin" : "dashboard"}/settings`}
              >
                <img
                  src={user?.avatar || "/avatar-provider-1.jpg"}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border-2 border-teal-500 cursor-pointer"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}