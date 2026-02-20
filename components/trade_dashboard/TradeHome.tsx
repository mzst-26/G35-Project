"use client";

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Calendar, 
  Briefcase, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  PoundSterling
} from 'lucide-react';
import { TradeDashboardProps } from '@/types/trade-dashboard';
import TradeJobCard from '@/components/trade_dashboard/trade_job_cards';
import { useTradeJobs } from '@/hooks/useTradeJobs';

export default function TradeHome({ onNavigateToSection }: TradeDashboardProps) {
  const [jobTab, setJobTab] = useState<'pending' | 'upcoming'>('pending');
  const [pendingCountdown, setPendingCountdown] = useState<number>(() => 60 * 60); // 1 hour in seconds
  
  // Fetch jobs from hook
  const { jobs, stats } = useTradeJobs();
  
  // TODO: Replace with API call to fetch availability data
  const availabilityDeadline = 7;
  const availableDays = 18;
  const totalDays = 30;

  // Filter jobs for dashboard: pending + upcoming only
  const dashboardJobs = jobs.filter(j => j.status === 'pending' || j.status === 'upcoming');
  
  // Filter jobs based on selected tab
  const displayedJobs = jobTab === 'pending' 
    ? jobs.filter(j => j.status === 'pending')
    : jobs.filter(j => j.status === 'upcoming');

  useEffect(() => {
    const timer = setInterval(() => {
      setPendingCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const clamped = Math.max(totalSeconds, 0);
    const days = Math.floor(clamped / 86400);
    const hours = Math.floor((clamped % 86400) / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Alert Banner & Status Section */}
      <div className="space-y-2 mb-4">
        {/* 7-day Availability Alert */}
        {availabilityDeadline <= 7 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-900 flex flex-col md:flex-row md:items-center gap-2">
              <span>You have {availabilityDeadline} days to set your availability for next month.</span>
              <Button 
                variant="link" 
                className="text-amber-900 underline p-0 h-auto justify-start md:justify-center"
                onClick={() => onNavigateToSection('calendar')}
              >
                Update now →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Penalty Status Notification */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-xs text-green-700">No penalty fees</span>
        </div>
      </div>

      {/* Stats Cards - 3 columns on all screen sizes */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-4">
        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 sm:h-12 w-8 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 sm:h-6 w-4 sm:w-6 text-slate-600" />
              </div>
              {/* Mobile: Circular progress beside icon */}
              <div className="sm:hidden">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                    <circle 
                      cx="20" 
                      cy="20" 
                      r="16" 
                      fill="none" 
                      stroke="#2563eb" 
                      strokeWidth="2"
                      strokeDasharray={`${(availableDays / totalDays) * 100.48} 100.48`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-900">{Math.round((availableDays / totalDays) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-lg sm:text-3xl text-slate-900 mb-0.5 sm:mb-1 font-semibold">{availableDays}/{totalDays}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 line-clamp-2">Monthly Availability</p>
            
            {/* Desktop: Linear progress below */}
            <div className="hidden sm:block">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(availableDays / totalDays) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">{Math.round((availableDays / totalDays) * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 sm:h-12 w-8 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 sm:h-6 w-4 sm:w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-lg sm:text-3xl text-slate-900 mb-0.5 sm:mb-1 font-semibold">{dashboardJobs.length}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-1 line-clamp-2">Total Jobs</p>
            <p className="text-xs text-slate-500">{stats.pending} pending</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 sm:h-12 w-8 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <PoundSterling className="h-4 sm:h-6 w-4 sm:w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-lg sm:text-3xl text-slate-900 mb-0.5 sm:mb-1 font-semibold">£{stats.completedEarnings}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-1 line-clamp-2">Completed Earnings</p>
            <p className="text-xs text-slate-500">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Penalty Status
      <div className="mb-4">
        <Card className="bg-green-50 border-green-200 shadow-sm !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl text-green-900 mb-1">£0</p>
                <p className="text-sm text-green-700">No outstanding penalty fees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Upcoming Jobs with Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl text-slate-900">Jobs</h2>
          <Button 
            variant="ghost" 
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm md:text-base"
            onClick={() => onNavigateToSection('jobs')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Job Tabs */}
        <div className="flex gap-2 mb-3 border-b border-slate-200">
          <button
            onClick={() => setJobTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              jobTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setJobTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              jobTab === 'upcoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({stats.upcoming})
          </button>
        </div>

        {/* Job Cards */}
        <div className="space-y-4">
          {displayedJobs.length > 0 ? (
            displayedJobs.map((job) => (
              <TradeJobCard
                key={job.id}
                job={job}
                onViewDetails={() => onNavigateToSection('jobs')}
                countdownText={
                  job.status === 'pending'
                    ? formatCountdown(pendingCountdown)
                    : undefined
                }
              />
            ))
          ) : (
            <Card className="shadow-sm border-slate-200 !py-3">
              <CardContent className="pt-3">
                <p className="text-sm text-slate-600 text-center">No {jobTab} jobs at the moment</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
