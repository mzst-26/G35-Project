/**
 * JobParameterItem - Displays a single job parameter
 * Shows icon, label, and value. Displays "Not set" if no value provided.
 */

'use client';

import { Badge } from '@/components/ui/badge';

interface JobParameterItemProps {
  icon: React.ReactNode;    // Icon to display (e.g., MapPin, Users)
  label: string;             // Parameter name (e.g., "Location")
  value?: string | number;   // Parameter value (optional)
  isBadge?: boolean;         // Render value as badge or text
}

export function JobParameterItem({ icon, label, value, isBadge }: JobParameterItemProps) {
  return (
    <div className="space-y-2">
      {/* Label with icon */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {icon}
        <span>{label}</span>
      </div>
      
      {/* Value display - badge, text, or "Not set" */}
      {value ? (
        isBadge ? (
          <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
            {value}
          </Badge>
        ) : (
          <p className="text-sm text-slate-900">{value}</p>
        )
      ) : (
        <p className="text-sm text-slate-400">Not set</p>
      )}
    </div>
  );
}
