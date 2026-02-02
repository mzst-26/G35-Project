"use client";

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
  { id: 1, title: 'Office Electrical Rewiring', company: 'Tech Corp Ltd', location: 'London, EC1', date: '2026-02-25', pay: 280, status: 'confirmed' as const },
  { id: 2, title: 'Residential Installation', company: 'Property Group', location: 'Manchester, M1', date: '2026-02-28', pay: 320, status: 'confirmed' as const },
  { id: 3, title: 'Emergency Repair', company: 'Retail Solutions', location: 'Birmingham, B1', date: '2026-03-02', pay: 450, status: 'pending' as const },
];

export default function TradeHome({ onNavigateToSection }: TradeDashboardProps) {
  // TODO: Replace with API call to fetch availability data
  const availabilityDeadline = 7;
  const availableDays = 18;
  const totalDays = 30;

  const totalEarnings = upcomingJobs.reduce((sum, job) => sum + job.pay, 0);
  const confirmedJobsCount = upcomingJobs.filter(j => j.status === 'confirmed').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Alert Banner */}
      {availabilityDeadline <= 7 && (
        <div className="mb-8">
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
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-3xl text-slate-900 mb-1">{availableDays}/{totalDays}</p>
            <p className="text-sm text-slate-600 mb-3">Monthly Availability</p>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(availableDays / totalDays) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">{Math.round((availableDays / totalDays) * 100)}% days available</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-3xl text-slate-900 mb-1">{upcomingJobs.length}</p>
            <p className="text-sm text-slate-600 mb-1">Upcoming Jobs</p>
            <p className="text-xs text-slate-500">{confirmedJobsCount} confirmed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <PoundSterling className="h-6 w-6 text-slate-600" />
              </div>
            </div>
            <p className="text-3xl text-slate-900 mb-1">£{totalEarnings}</p>
            <p className="text-sm text-slate-600 mb-1">Expected Earnings</p>
            <p className="text-xs text-slate-500">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Penalty Status */}
      <div className="mb-8">
        <Card className="bg-green-50 border-green-200 shadow-sm">
          <CardContent className="pt-6">
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
      </div>

      {/* Upcoming Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl text-slate-900">Upcoming Jobs</h2>
          <Button 
            variant="ghost" 
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => onNavigateToSection('jobs')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <div className="space-y-4">
          {upcomingJobs.map((job) => (
            <Card 
              key={job.id}
              className="shadow-sm border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigateToSection('jobs')}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-lg text-slate-900">{job.title}</h3>
                      <Badge className={
                        job.status === 'confirmed' 
                          ? 'bg-green-50 text-green-700 border-green-200 border'
                          : 'bg-slate-100 text-slate-700 border-slate-200 border'
                      }>
                        {job.status === 'confirmed' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {job.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{job.date}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-slate-900">
                      <PoundSterling className="h-4 w-4" />
                      <span>£{job.pay}/day</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full lg:w-auto">
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
