"use client";

import { Button } from "@/components/ui/button"; //importing components for dashboard, for UI components and components for different dashboard sections
import { Calendar, Briefcase, AlertTriangle, MessageSquare, Settings as SettingsIcon, Menu, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { TradeNavItem, TradeSectionKey } from "@/types/trade-dashboard";
import TradeHome from "@/components/trade_dashboard/TradeHome";
import TradeCalendar from "@/components/trade_dashboard/calendar";
import TradeJobs from "@/components/trade_dashboard/jobs";
import Penalties from "@/components/trade_dashboard/penalties";
import Support from "@/components/trade_dashboard/support";
import Settings from "@/components/trade_dashboard/settings";
import { SidebarProfilePanel } from "@/components/auth/SidebarProfilePanel";
import { useAuth } from "@/components/auth/AuthProvider";



export default function TradeDashboard() {
    const navItems:TradeNavItem[] = [
      { label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
      { label: 'Calendar', icon: Calendar, section: 'calendar' },
      { label: 'Jobs', icon: Briefcase, section: 'jobs' },
      { label: 'Penalties', icon: AlertTriangle, section: 'penalties' },
      { label: 'Support', icon: MessageSquare, section: 'support' },
      { label: 'Settings', icon: SettingsIcon, section: 'settings' },
    ];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<TradeSectionKey>('dashboard');
  const { user } = useAuth();



  return (
    <div className="min-h-screen bg-slate-50">

      {/* Mobile head */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">Infra</h2>
              <p className="text-xs text-slate-500">Trade</p>
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

      {/* mobile sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-40 bg-white border-r border-slate-200 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">Infra</h2>
              <p className="text-sm text-slate-500">Trade Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
              {navItems.map((sideBarActionItem) => (
                <Button
                  key={sideBarActionItem.label}
                  variant={activeSection === sideBarActionItem.section ? "default" : "ghost"}
                  onClick={() => {
                    setActiveSection(sideBarActionItem.section);
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

          <div className="mt-6 border-t border-slate-200 pt-4">
            <SidebarProfilePanel
              userLabel={user?.email}
              onOpenSettings={() => {
                setActiveSection('settings');
                setMobileMenuOpen(false);
              }}
              logoutRedirectPath="/login"
            />
          </div>
        </div>
      )}

      {/* Desktop siebar */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-40 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">Infra</h2>
              <p className="text-sm text-slate-500">Trade Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
            {navItems.map((sideBarActionItem) => (
              <Button
                key={sideBarActionItem.label}
                variant={activeSection === sideBarActionItem.section ? "default" : "ghost"}
                onClick={() => setActiveSection(sideBarActionItem.section)}
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

        <div className="border-t border-slate-200 p-4">
          <SidebarProfilePanel
            userLabel={user?.email}
            onOpenSettings={() => setActiveSection('settings')}
            logoutRedirectPath="/login"
          />
        </div>

      </div>

      {/* Main dashboard content */}
      <div className="md:ml-64">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
            
          {activeSection === 'dashboard' && <TradeHome onNavigateToSection={setActiveSection} />}
          {activeSection === 'calendar' && <TradeCalendar />}
          {activeSection === 'jobs' && <TradeJobs />}
          {activeSection === 'penalties' && <Penalties />}
          {activeSection === 'support' && <Support />}
          {activeSection === 'settings' && <Settings />}
          

        </div>
      </div>
    </div>
  );
}
