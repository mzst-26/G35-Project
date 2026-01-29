'use client';

import { Switch } from '@/components/ui/switch';

interface NotificationItemProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * NotificationItem Component
 * Reusable notification preference toggle
 * Displays label, description, and switch control
 */
export function NotificationItem({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: NotificationItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      {/* Label and Description */}
      <div>
        <p className="text-slate-900 font-medium">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      {/* Toggle Switch */}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
