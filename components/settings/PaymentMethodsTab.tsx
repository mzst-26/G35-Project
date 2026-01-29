'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { PaymentMethod } from '@/types/company-settings';
import { PaymentCard } from './PaymentCard';

interface PaymentMethodsTabProps {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  onSetDefault: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddNew: () => void;
}

/**
 * PaymentMethodsTab Component
 * Displays list of saved payment methods
 * Allows user to add, delete, and set default payment method
 */
export function PaymentMethodsTab({
  paymentMethods,
  isLoading,
  onSetDefault,
  onDelete,
  onAddNew,
}: PaymentMethodsTabProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-slate-900">Payment Methods</CardTitle>
        <CardDescription className="text-slate-600">
          Manage your saved payment methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Methods List */}
        {paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
            <PaymentCard
              key={method.id}
              method={method}
              isLoading={isLoading}
              onSetDefault={() => onSetDefault(method.id)}
              onDelete={() => onDelete(method.id)}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No payment methods saved yet</p>
          </div>
        )}

        {/* Add New Card Button */}
        <Button
          variant="outline"
          className="w-full text-slate-700 border-slate-300 hover:bg-slate-50"
          onClick={onAddNew}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Card
        </Button>
      </CardContent>
    </Card>
  );
}
