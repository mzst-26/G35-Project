"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function CompanyDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
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
        <div className="lg:hidden fixed top-0 left-0 bottom-0 w-72 z-40 bg-white border-r border-slate-200 shadow-xl p-6">
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
            {/* I will later add navigation in here */}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-40 bg-white border-r border-slate-200 flex-col">
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
          {/* navigation items will go here later */}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="lg:ml-64">
        <div className="p-4 md:p-8 pt-20 lg:pt-8">
          {/* this is the section where the dashboard content is goint to be */}
        </div>
      </div>
    </div>
  );
}
