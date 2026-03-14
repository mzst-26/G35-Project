'use client';

import { Button } from '@/components/ui/button';

export default function RecruiterPoliciesPage() {
  const handleApprove = () => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'recruiter-policy-approved', acceptedAt: new Date().toISOString() },
        window.location.origin,
      );
    }
    window.close();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Test Policies and Terms</h1>

        <section className="mt-6">
          <h2 className="text-lg font-medium text-slate-900">Policy Summary</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-700">
            <li>Use of the platform is restricted to authorized business operations.</li>
            <li>Submitted company data must be accurate and kept up to date.</li>
            <li>Account access may be suspended for policy violations or misuse.</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-medium text-slate-900">Terms and Conditions</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-700">
            <li>You agree to comply with all applicable legal and contractual obligations.</li>
            <li>You are responsible for actions performed under your approved account.</li>
            <li>Service access remains subject to successful admin review and ongoing compliance checks.</li>
          </ul>
        </section>

        <div className="mt-8 flex justify-end">
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove}>
            Approve and Continue
          </Button>
        </div>
      </div>
    </main>
  );
}
