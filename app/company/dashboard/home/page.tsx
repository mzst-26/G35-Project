"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, LayoutDashboard, Menu, MessageSquare, Plus, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavItem, SectionKey } from "@/types/dashboard";
import RecruiterHome from "@/components/recruiter_dashboard/recruiterHome";
import CreateJobHome from "@/components/recruiter_dashboard/create-job";
import Payments from "@/components/recruiter_dashboard/payments";
import JobDetails from "@/components/recruiter_dashboard/job-details";
import Support from "@/components/recruiter_dashboard/support";
import { JobRequestPage } from "@/components/chat/JobRequestPage";
import { useRouter } from "next/navigation";


export default function CompanyDashboard() {
    //this items are the buttons on the sidebar, this will be converted into rendered html
    const navItems:NavItem[] = [
      { label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
      { label: 'Create Job', icon: Plus, section: 'create-job' },
      { label: 'Payments', icon: CreditCard, section: 'payments' },
      { label: 'Support', icon: MessageSquare, section: 'support' },
      { label: 'Settings', icon: Settings, section: 'settings' },
    ];
  //define the states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(navItems[0].section);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const router = useRouter();

  // Initialize active section from URL on mount (deep-link support)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sectionParam = params.get("section") as SectionKey | null;
      if (sectionParam && navItems.some((i) => i.section === sectionParam)) {
        setActiveSection(sectionParam);
      }
    } catch (e) {
      // ignore URL parsing issues
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //create a trigger that lisstens to the active section changes
  useEffect(() => {
    const event = new CustomEvent("company-dashboard:active-section-change", {
      detail: { section: activeSection },
    });
    window.dispatchEvent(event);
  }, [activeSection]);

  // Reflect active section in the URL (query param `section`)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("section", activeSection);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      // Use replace to avoid cluttering history; switch to push for back-button behavior
      router.replace(newUrl);
    } catch (e) {
      // ignore URL update issues
    }
  }, [activeSection, router]);


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
              <p className="text-xs text-slate-500">Company</p>
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
              <p className="text-sm text-slate-500">Company Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
              {navItems.map((sideBarActionItem) => (
                //for every item in the navItem object, we generate a button and change their styling based on if the button is the current slelected page or not
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
              <p className="text-sm text-slate-500">Company Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
            {navItems.map((sideBarActionItem) => (
              //for every item in the navItem object, we generate a button and change their styling based on if the button is the current slelected page or not
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
            
          {/* Show AI Chat Interface */}
          
            <>
              {activeSection === 'dashboard' && (
                <RecruiterHome onCreateJob={() =>
                  setActiveSection(navItems.find(i => i.section === "create-job")?.section ?? navItems[0].section) 
                }/>
              )}

              {activeSection === "create-job" && (
                <JobRequestPage 
                  onSubmit={(jobParams) => {
                    console.log('Job submitted:', jobParams);
                    setActiveSection('dashboard');
              }}
            />
              )}

            {activeSection === 'payments' && (
              selectedJobId ? (
                <JobDetails 
                  jobId={selectedJobId} 
                  onBack={() => setSelectedJobId(null)} 
                />
              ) : (
                <Payments onViewJob={(jobId) => setSelectedJobId(jobId)} />
              )
            )}

              {activeSection === 'support' && (
                <Support />
              )}
              {activeSection === 'settings' && (
                <>
                  this is Settings
                </>
              )}
            </>
          
          

        </div>
      </div>
    </div>
  );
}
