import { ArrowRight, Calendar, CheckCircle2, Clock, MapPin, PlayCircle, Users } from 'lucide-react';
import type { CompanyJob } from '@/types/company-jobs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Map status to label and colors
const statusConfig = {
  pending: { label: 'Pending', icon: Clock, badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  allocated: { label: 'Allocated', icon: CheckCircle2, badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  'in-progress': { label: 'In Progress', icon: PlayCircle, badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2, badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', icon: Clock, badge: 'bg-red-50 text-red-700 border-red-200' },
} as const;

// Props for the job card
interface CompanyJobCardProps {
  job: CompanyJob;
  onOpen: (jobId: string) => void;
  onViewDetails?: (jobId: string) => void;
}

export function CompanyJobCard({ job, onOpen, onViewDetails }: CompanyJobCardProps) {
  // Pick the right label + icon for this status
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  return (
    <Card
      className="shadow-sm border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onOpen(job.id)}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-lg text-slate-900">{job.title}</h3>
              <Badge className={`${config.badge} border`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>
                  {job.workers} worker{job.workers > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{job.date}</span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full lg:w-auto"
            onClick={(event) => {
              event.stopPropagation();
              onViewDetails?.(job.id);
            }}
          >
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
