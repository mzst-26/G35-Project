"use client";

import { Button } from "@/components/ui/button";
import {
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  X,
  Shield,
} from "lucide-react";
import { useState } from "react";

// import the settings section component
import AdminSettings from "@/components/admin_dashboard/adminSettings";
import UserManagement from "@/components/admin_dashboard/UserManagement";
import UserDetailView from "@/components/admin_dashboard/UserDetailView";

import type { NavItem, SectionKey } from "@/types/admin-dashboard";

export default function AdminDashboard() {
  // this items are the buttons on the sidebar, this will be converted into rendered html
  const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
    { label: "Users", icon: Plus, section: "users" },
    { label: "Appeals", icon: CreditCard, section: "appeals" },
    { label: "Support", icon: MessageSquare, section: "support" },
    { label: "Analytics", icon: MessageSquare, section: "analytics" },
    { label: "Settings", icon: Settings, section: "settings" },
  ];

  // define the states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(
    navItems[0].section
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-40 bg-white border-r border-slate-200 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((sideBarActionItem) => (
              <Button
                key={sideBarActionItem.label}
                variant={
                  activeSection === sideBarActionItem.section
                    ? "default"
                    : "ghost"
                }

                onClick={() => {
                  setActiveSection(sideBarActionItem.section);

                  if (sideBarActionItem.section !== "users") {
                    setSelectedUserId(null);
                  }

                  setMobileMenuOpen(false);
                }}

                className={`w-full justify-start gap-3 ${
                  activeSection === sideBarActionItem.section
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <sideBarActionItem.icon className="h-5 w-5" />
                {sideBarActionItem.label}
              </Button>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-40 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((sideBarActionItem) => (
            <Button
              key={sideBarActionItem.label}
              variant={
                activeSection === sideBarActionItem.section ? "default" : "ghost"
              }

              onClick={() => {
                setActiveSection(sideBarActionItem.section);

                if (sideBarActionItem.section !== "users") {
                  setSelectedUserId(null);
                }
              }}
              className={`w-full justify-start gap-3 ${
                activeSection === sideBarActionItem.section
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <sideBarActionItem.icon className="h-5 w-5" />
              {sideBarActionItem.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="md:ml-64">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {activeSection === "dashboard" && <>this is Dashboard</>}

          {activeSection === "users" && (
            <>
              {selectedUserId ? (
                <UserDetailView
                  userId={selectedUserId}
                  onBackToList={() => setSelectedUserId(null)}
                />
              ) : (
                <UserManagement onSelectUser={(id) => setSelectedUserId(id)} />
              )}
            </>
          )}

          {activeSection === "appeals" && <>this is Appeals</>}

          {activeSection === "support" && <>this is Support</>}

          {activeSection === "analytics" && <>this is Analytics</>}

          {activeSection === "settings" && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}