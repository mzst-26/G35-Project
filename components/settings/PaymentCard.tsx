'use client';

import { Button } from '@/components/ui/button';
import { CreditCard, Trash2 } from 'lucide-react';
import { PaymentMethod } from '@/types/company-settings';

interface PaymentCardProps {
  method: PaymentMethod;
  isLoading: boolean;
  onSetDefault?: () => void;
  onDelete: () => void;
}

/**
 * PaymentCard Component
 * Reusable component displaying a single payment method
 * Shows card type, last 4 digits, expiry, and actions
 */
export function PaymentCard({
  method,
  isLoading,
  onSetDefault,
  onDelete,
}: PaymentCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
      {/* Card Details */}
      <div className="flex items-center gap-4">
        {/* Card Icon */}
        <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-slate-600" />
        </div>

        {/* Card Info */}
        <div>
          <p className="text-slate-900 font-medium">
            {method.type} •••• {method.last4}
          </p>
          <p className="text-sm text-slate-500">Expires {method.expiry}</p>
        </div>

        {/* Default Badge */}
        {method.isDefault && (
          <span className="ml-2 inline-block text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Default
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!method.isDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetDefault}
            disabled={isLoading}
            className="text-slate-700 border-slate-300"
          >
            Set Default
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isLoading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
