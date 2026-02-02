"use client";

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Calendar, 
  Briefcase, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  PoundSterling,
  Building,
  MapPin,
  Clock
} from 'lucide-react';
import { TradeDashboardProps } from '@/types/trade-dashboard';

// TODO: Replace with API call via useTradeJobs hook when backend is ready
const upcomingJobs = [
  { id: 1, title: 'Office Electrical Rewiring', company: 'Tech Corp Ltd', location: 'London, EC1', date: '2026-02-25', pay: 280, days: 2, status: 'confirmed' as const },
  { id: 2, title: 'Residential Installation', company: 'Property Group', location: 'Manchester, M1', date: '2026-02-28', pay: 320, days: 3, status: 'confirmed' as const },
  { id: 3, title: 'Emergency Repair', company: 'Retail Solutions', location: 'Birmingham, B1', date: '2026-03-02', pay: 450, days: 5, status: 'pending' as const, actionByHours: 12 },
];

export default function TradeHome({ onNavigateToSection }: TradeDashboardProps) {
  const [jobTab, setJobTab] = useState<'pending' | 'upcoming'>('pending');
  const [pendingCountdown, setPendingCountdown] = useState<number>(() => 60 * 60); // 1 hour in seconds
  
  // TODO: Replace with API call to fetch availability data
  const availabilityDeadline = 7;
  const availableDays = 18;
  const totalDays = 30;

  const totalEarnings = upcomingJobs.reduce((sum, job) => sum + job.pay, 0);
  const confirmedJobsCount = upcomingJobs.filter(j => j.status === 'confirmed').length;
  const pendingJobsCount = upcomingJobs.filter(j => j.status === 'pending').length;
  
  // Filter jobs based on selected tab
  const displayedJobs = jobTab === 'pending' 
    ? upcomingJobs.filter(j => j.status === 'pending')
    : upcomingJobs.filter(j => j.status === 'confirmed');

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
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 sm:h-12 w-8 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 sm:h-6 w-4 sm:w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-lg sm:text-3xl text-slate-900 mb-0.5 sm:mb-1 font-semibold">{availableDays}/{totalDays}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 line-clamp-2">Monthly Availability</p>
            
            {/* Mobile: Circular progress, Desktop: Linear progress */}
            <div className="hidden sm:block">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(availableDays / totalDays) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">{Math.round((availableDays / totalDays) * 100)}%</p>
            </div>
            
            <div className="sm:hidden flex justify-center">
              <div className="relative w-12 h-12">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                  <circle 
                    cx="24" 
                    cy="24" 
                    r="20" 
                    fill="none" 
                    stroke="#2563eb" 
                    strokeWidth="2"
                    strokeDasharray={`${(availableDays / totalDays) * 125.6} 125.6`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-900">{Math.round((availableDays / totalDays) * 100)}%</span>
                </div>
              </div>
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
            <p className="text-lg sm:text-3xl text-slate-900 mb-0.5 sm:mb-1 font-semibold">{upcomingJobs.length}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-1 line-clamp-2">Upcoming Jobs</p>
            <p className="text-xs text-slate-500">{confirmedJobsCount} confirmed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 sm:h-12 w-8 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <PoundSterling className="h-4 sm:h-6 w-4 sm:w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-lg sm:text-3xl text-slate-900 mb-0.5 sm:mb-1 font-semibold">£{totalEarnings}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-1 line-clamp-2">Expected Earnings</p>
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
            Pending ({pendingJobsCount})
          </button>
          <button
            onClick={() => setJobTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              jobTab === 'upcoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({confirmedJobsCount})
          </button>
        </div>

        {/* Job Cards */}
        <div className="space-y-4">
          {displayedJobs.length > 0 ? (
            displayedJobs.map((job) => (
              <Card 
                key={job.id}
                className="shadow-sm border-slate-200 hover:shadow-md transition-shadow cursor-pointer !py-3"
                onClick={() => onNavigateToSection('jobs')}
              >
                <CardContent className="pt-3 sm:pt-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg text-slate-900">{job.title}</h3>
                        <Badge className={
                          job.status === 'confirmed' 
                            ? 'bg-green-50 text-green-700 border-green-200 border text-xs'
                            : 'bg-amber-50 text-amber-700 border-amber-200 border text-xs'
                        }>
                          {job.status === 'confirmed' ? (
                            <CheckCircle2 className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                          ) : (
                            <span className="relative mr-1.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-90 animate-ping" />
                              <span className="relative inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-orange-500" />
                            </span>
                          )}
                          {job.status !== 'confirmed' && (
                            <AlertTriangle className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                          )}
                          <span className="hidden sm:inline">{job.status === 'confirmed' ? 'Confirmed' : 'Pending'}</span>
                          <span className="sm:hidden">{job.status === 'confirmed' ? 'Con.' : 'Pend.'}</span>
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <Building className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate text-xs sm:text-sm">{job.company}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate text-xs sm:text-sm">{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">{job.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-slate-900 text-sm sm:text-base">
                          <PoundSterling className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>£{job.pay}/day · {job.days} days</span>
                        </div>
                        {job.status === 'pending' && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 animate-pulse">
                            <Clock className="h-3 w-3" />
                            <span>{formatCountdown(pendingCountdown)} left to accept</span>
                          </div>
                        )}
                    </div>
                    <Button variant="outline" className="w-full lg:w-auto text-xs sm:text-sm py-1 sm:py-2">
                      Details
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
