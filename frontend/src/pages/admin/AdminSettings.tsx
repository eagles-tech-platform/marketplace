import { useState } from "react";
import { User, Shield } from "lucide-react";
import DashboardLayout from "@/components/auth/DashboardLayout";
import ProfileTab from "@/components/auth/Profiletab";
import SecurityTab from "@/components/auth/Securitytab";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <DashboardLayout role="admin" title="Settings">
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "bg-teal-50 text-teal-600 border-l-4 border-l-teal-500" : "text-slate-600 hover:bg-slate-50 border-l-4 border-l-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === "profile" && (
            <ProfileTab
              title="Admin Profile"
              fallbackAvatar="/avatar-provider-1.jpg"
              editable={false}
              header={
                <>
                  <p className="font-medium text-slate-800">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Administrator</span>
                </>
              }
              footer={
                <p className="text-xs text-slate-400">
                  There's only ever one admin account by design — created once via the bootstrap script, never through the app itself.
                </p>
              }
            />
          )}

          {activeTab === "security" && (
            <SecurityTab
              passwordHint="If you're still using the password from the one-time bootstrap script, change it now."
              twoFactorOffText="Strongly recommended for the admin account"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}