'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail } from 'lucide-react';

export default function RecruiterRegistrationConfirmationPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">Request received</h1>
          <p className="text-slate-600 text-base leading-relaxed">
            We&apos;ve received your registration request. Our team will review it and{' '}
            <span className="font-medium text-slate-800">email you with an update</span> as soon as a decision has been made.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-4 text-left shadow-sm">
          <div className="mt-0.5 flex-shrink-0">
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">What happens next?</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600 list-disc pl-4">
              <li>Our admin team will review your company details.</li>
              <li>You will receive an email once your account is approved or if we need more information.</li>
              <li>Once approved, you can log in using the email address you submitted.</li>
            </ul>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push('/login')}
        >
          Back to login
        </Button>
      </div>
    </div>
  );
}
