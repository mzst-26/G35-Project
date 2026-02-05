"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3, Briefcase, LayoutDashboard, Menu, MessageSquare, Settings as SettingsIcon, Users, X } from "lucide-react";
import { useState } from "react";

type AdminSectionKey = "dashboard" | "appeals" | "users" | "support" | "analytics" | "settings";

interface AdminNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: AdminSectionKey;
}

export default function AdminDashboard() {
  const navItems: AdminNavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
    { label: "Appeals", icon: AlertCircle, section: "appeals" },
    { label: "Users", icon: Users, section: "users" },
    { label: "Support", icon: MessageSquare, section: "support" },
    { label: "Analytics", icon: BarChart3, section: "analytics" },
    { label: "Settings", icon: SettingsIcon, section: "settings" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white text-sm">TF</span>
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
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-40 bg-white border-r border-slate-200 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.label}
                variant={activeSection === item.section ? "default" : "ghost"}
                onClick={() => {
                  setActiveSection(item.section);
                  setMobileMenuOpen(false);
                }}
                className={`w-full justify-start gap-3 ${
                  activeSection === item.section
                    ? "bg-black text-white hover:bg-gray-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-40 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={activeSection === item.section ? "default" : "ghost"}
              onClick={() => setActiveSection(item.section)}
              className={`w-full justify-start gap-3 ${
                activeSection === item.section
                  ? "bg-black text-white hover:bg-gray-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="md:ml-64">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-600">Overview and management tools</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Users</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">2,543</p>
                    </div>
                    <Users className="h-10 w-10 text-black" />
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Pending Appeals</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">12</p>
                    </div>
                    <AlertCircle className="h-10 w-10 text-black" />
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Open Tickets</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">8</p>
                    </div>
                    <MessageSquare className="h-10 w-10 text-black" />
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Active Jobs</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">156</p>
                    </div>
                    <Briefcase className="h-10 w-10 text-black" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "appeals" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Appeals Management</h1>
                <p className="text-slate-600">Review and manage penalty appeals</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600">Appeals will be displayed here</p>
              </div>
            </div>
          )}

          {activeSection === "users" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-600">Manage all platform users</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600">Users will be displayed here</p>
              </div>
            </div>
          )}

          {activeSection === "support" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Support Management</h1>
                <p className="text-slate-600">Review and manage support tickets</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600">Support tickets will be displayed here</p>
              </div>
            </div>
          )}

          {activeSection === "analytics" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
                <p className="text-slate-600">Platform analytics and reporting</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600">Analytics will be displayed here</p>
              </div>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>
                <p className="text-slate-600">Platform configuration and settings</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600">Settings will be displayed here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
