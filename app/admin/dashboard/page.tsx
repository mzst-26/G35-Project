"use client";

import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { NavItem, SectionKey } from "@/types/admin-dashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { SidebarProfilePanel } from "@/components/auth/SidebarProfilePanel";
import AnalyticsManagement from "@/components/admin_dashboard/AnalyticsManagement";
import AppealsManagement from "@/components/admin_dashboard/AppealsManagement";
import SupportManagement from "@/components/admin_dashboard/SupportManagement";
import UsersManagement from "@/components/admin_dashboard/UsersManagement";
import AdminHome from "@/components/admin_dashboard/AdminHome";
import AdminSettings from "@/components/admin_dashboard/AdminSettings";
import ApplicationsManagement from "@/components/admin_dashboard/ApplicationsManagement";

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { label: "Users", icon: Users, section: "users" },
  { label: "Applications", icon: ClipboardList, section: "applications" },
  { label: "Appeals", icon: CreditCard, section: "appeals" },
  { label: "Support", icon: MessageSquare, section: "support" },
  { label: "Analytics", icon: BarChart3, section: "analytics" },
  { label: "Settings", icon: Settings, section: "settings" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(() => {
    if (typeof window === "undefined") {
      return "dashboard";
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get("page") as SectionKey | null;
      if (pageParam && navItems.some((item) => item.section === pageParam)) {
        return pageParam;
      }
    } catch {
      // Ignore malformed URL query values.
    }

    return "dashboard";
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("page", activeSection);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.replace(newUrl);
    } catch {
      // Ignore URL update failures and keep local navigation working.
    }
  }, [activeSection, router]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user || user.role !== "admin") {
      router.replace("/login/adminLogin");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading admin session...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Redirecting to admin login...</p>
      </div>
    );
  }

  const sectionComponentMap: Record<SectionKey, ReactNode> = {
    dashboard: <AdminHome />,
    users: <UsersManagement />,
    applications: <ApplicationsManagement />,
    appeals: <AppealsManagement />,
    support: <SupportManagement />,
    analytics: <AnalyticsManagement />,
    settings: <AdminSettings />,
  };

  const renderNavButton = (item: NavItem, closeMobileSidebar = false) => (
    <Button
      key={item.section}
      variant={activeSection === item.section ? "default" : "ghost"}
      onClick={() => {
        setActiveSection(item.section);
        if (closeMobileSidebar) {
          setIsMobileSidebarOpen(false);
        }
      }}
      className={`w-full justify-start gap-3 ${
        activeSection === item.section
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900">Infra</h2>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen((open) => !open)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            {isMobileSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-40 bg-white border-r border-slate-200 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900">Infra</h2>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => renderNavButton(item, true))}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <SidebarProfilePanel
              userLabel={user.email}
              onOpenSettings={() => {
                setActiveSection("settings");
                setIsMobileSidebarOpen(false);
              }}
              logoutRedirectPath="/login"
            />
          </div>
        </div>
      )}

      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-40 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900">Infra</h2>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => renderNavButton(item))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <SidebarProfilePanel
            userLabel={user.email}
            onOpenSettings={() => setActiveSection("settings")}
            logoutRedirectPath="/login"
          />
        </div>
      </div>

      <div className="md:ml-64">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {sectionComponentMap[activeSection]}
        </div>
      </div>
    </div>
  );
}