"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, LayoutDashboard, Menu, MessageSquare, Plus, Settings, X } from "lucide-react";
import { useState } from "react";
import { NavItem, SectionKey } from "@/types/dashboard";
import RecruiterHome from "@/components/recruiter_dashboard/recruiterHome";
import CreateJobHome from "@/components/recruiter_dashboard/create-job";
import { useRouter } from "next/navigation";


export default function TradeDashboard() {
    const navItems:NavItem[] = [
      { label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
      { label: 'Create Job', icon: Plus, section: 'create-job' },
      { label: 'Payments', icon: CreditCard, section: 'payments' },
      { label: 'Support', icon: MessageSquare, section: 'support' },
      { label: 'Settings', icon: Settings, section: 'settings' },
    ];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(navItems[0].section);

  const router = useRouter();


  return (
    <div className="min-h-screen bg-slate-50">

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
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

      {/* Mobile Sidebar) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-40 bg-white border-r border-slate-200 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
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
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-40 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white">TF</span>
            </div>
            <div>
              <h2 className="text-slate-900">TradesFair</h2>
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

      </div>

      {/* MAIN CONTENT */}
      <div className="md:ml-64">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
            
          {activeSection === 'dashboard' && (
            <RecruiterHome onCreateJob={() =>
              setActiveSection(navItems.find(i => i.section === "create-job")?.section ?? navItems[0].section)
            }/>
            )}


          {activeSection === "create-job" && (
            <CreateJobHome
              onAIChat={() => router.push("/trade/dashboard")}
              onManualForm={() => router.push("/trade/dashboard")}
            />
          )}

            {activeSection === 'payments' && (
              <>
                this is Payments
              </>
          )}

            {activeSection === 'support' && (
              <>
                this is Support
              </>
          )}
             {activeSection === 'settings' && (
              <>
                this is Settings
              </>
          )}
          

        </div>
      </div>
    </div>
  );
}
