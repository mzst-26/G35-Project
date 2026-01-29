'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { NotificationPreferences } from '@/types/company-settings';
import { NotificationItem } from './NotificationItem';

interface NotificationsTabProps {
  notifications: NotificationPreferences;
  isLoading: boolean;
  onToggleEmailNotification: (notification: 'jobAllocated' | 'jobCompleted' | 'paymentReminder') => void;
  onToggleSmsNotification: (notification: 'jobAllocated' | 'jobCompleted' | 'paymentReminder') => void;
  onSave: () => Promise<void>;
}

/**
 * NotificationsTab Component
 * Displays email and SMS notification preferences
 * Users can toggle each notification type independently
 */
export function NotificationsTab({
  notifications,
  isLoading,
  onToggleEmailNotification,
  onToggleSmsNotification,
  onSave,
}: NotificationsTabProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-slate-900">Notification Preferences</CardTitle>
        <CardDescription className="text-slate-600">
          Choose how you want to be notified
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Email Notifications
            </h3>

            <NotificationItem
              label="Job Allocated"
              description="When a worker is allocated to your job"
              checked={notifications.email.jobAllocated}
              disabled={isLoading}
              onCheckedChange={() => onToggleEmailNotification('jobAllocated')}
            />

            <NotificationItem
              label="Job Completed"
              description="When your job is marked as completed"
              checked={notifications.email.jobCompleted}
              disabled={isLoading}
              onCheckedChange={() => onToggleEmailNotification('jobCompleted')}
            />

            <NotificationItem
              label="Payment Reminders"
              description="Reminders for pending payments"
              checked={notifications.email.paymentReminder}
              disabled={isLoading}
              onCheckedChange={() => onToggleEmailNotification('paymentReminder')}
            />
          </div>

          <Separator className="bg-slate-200" />

          {/* SMS Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              SMS Notifications
            </h3>

            <NotificationItem
              label="Job Allocated"
              description="SMS alerts for job allocations"
              checked={notifications.sms.jobAllocated}
              disabled={isLoading}
              onCheckedChange={() => onToggleSmsNotification('jobAllocated')}
            />

            <NotificationItem
              label="Job Completed"
              description="SMS alerts for completed jobs"
              checked={notifications.sms.jobCompleted}
              disabled={isLoading}
              onCheckedChange={() => onToggleSmsNotification('jobCompleted')}
            />

            <NotificationItem
              label="Payment Reminders"
              description="SMS reminders for pending payments"
              checked={notifications.sms.paymentReminder}
              disabled={isLoading}
              onCheckedChange={() => onToggleSmsNotification('paymentReminder')}
            />
          </div>

          {/* Save Button */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-slate-700 border-slate-300"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
