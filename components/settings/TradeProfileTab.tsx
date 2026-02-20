'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CompanyProfile } from '@/types/company-settings';

interface ProfileTabProps {
  profile: CompanyProfile;
  isLoading: boolean;
  onUpdateField: (field: keyof CompanyProfile, value: string) => void;
  onSave: () => Promise<void>;
}

/**
 * TradeProfileTab Component
 * Displays trade worker profile form with personal info and contact details
 * Receives profile data and update handlers via props
 */
export function TradeProfileTab({
  profile,
  isLoading,
  onUpdateField,
  onSave,
}: ProfileTabProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-slate-900">Personal Profile</CardTitle>
        <CardDescription className="text-slate-600">
          Update your personal information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">
                Full Name
              </Label>
              <Input
                id="name"
                value={profile.companyName}
                onChange={(e) => onUpdateField('companyName', e.target.value)}
                disabled={isLoading}
                className="border-slate-300"
              />
            </div>
          </div>

          <Separator className="bg-slate-200" />

          {/* Contact Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => onUpdateField('phone', e.target.value)}
                  disabled={isLoading}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => onUpdateField('email', e.target.value)}
                  disabled={isLoading}
                  className="border-slate-300"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Address
            </h3>
            <div className="space-y-2">
              <Label htmlFor="addressLine1" className="text-slate-700">
                Address Line 1
              </Label>
              <Input
                id="addressLine1"
                value={profile.addressLine1}
                onChange={(e) => onUpdateField('addressLine1', e.target.value)}
                disabled={isLoading}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2" className="text-slate-700">
                Address Line 2 (Optional)
              </Label>
              <Input
                id="addressLine2"
                value={profile.addressLine2 || ''}
                onChange={(e) => onUpdateField('addressLine2', e.target.value)}
                disabled={isLoading}
                className="border-slate-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-slate-700">
                  City
                </Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => onUpdateField('city', e.target.value)}
                  disabled={isLoading}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode" className="text-slate-700">
                  Postcode
                </Label>
                <Input
                  id="postcode"
                  value={profile.postcode}
                  onChange={(e) => onUpdateField('postcode', e.target.value)}
                  disabled={isLoading}
                  className="border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              className="flex-1 bg-blue-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
