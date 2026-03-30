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
 * ProfileTab Component
 * Displays company profile form with company info, contact details, and address
 * Receives profile data and update handlers via props
 */
export function ProfileTab({
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
        <CardTitle className="text-slate-900">Company Profile</CardTitle>
        <CardDescription className="text-slate-600">
          Update your company information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Company Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-700">
                Company Name
              </Label>
              <Input
                id="companyName"
                value={profile.companyName}
                onChange={(e) => onUpdateField('companyName', e.target.value)}
                disabled
                className="border-slate-300"
              />
              <p className="text-xs text-slate-500">Company name is managed by administrators.</p>
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
                <Label htmlFor="contactName" className="text-slate-700">
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  value={profile.contactName}
                  onChange={(e) => onUpdateField('contactName', e.target.value)}
                  disabled={isLoading}
                  className="border-slate-300"
                />
              </div>
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
                disabled
                className="border-slate-300"
              />
              <p className="text-xs text-slate-500">Email address is managed by your account login.</p>
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
