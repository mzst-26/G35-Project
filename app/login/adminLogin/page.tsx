'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

import { AuthApiError, requestOtp, verifyOtp } from '@/lib/auth/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await requestOtp(email.trim().toLowerCase());
      setStep('verify');
      setInfoMessage('One-time code sent. Check your admin inbox.');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to request OTP right now.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
      });

      if (session.user.role !== 'admin') {
        setErrorMessage('This account is not an admin account.');
        return;
      }

      await refreshUser();
      router.push('/admin/dashboard');
    } catch (error) {
      if (error instanceof AuthApiError && error.code === 'MFA_ENROLLMENT_REQUIRED') {
        setErrorMessage('MFA enrollment is required for admin accounts. Please contact platform support.');
      } else if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to verify OTP right now.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = step === 'request' ? handleRequestOtp : handleVerifyOtp;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Card className="bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>Sign in with OTP and MFA-enabled admin account</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {infoMessage && <p className="text-sm text-emerald-700 mb-3">{infoMessage}</p>}
          {errorMessage && <p className="text-sm text-rose-600 mb-3">{errorMessage}</p>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white"
                disabled={step === 'verify'}
              />
            </div>

            {step === 'verify' && (
              <div className="space-y-2">
                <Label htmlFor="admin-otp">One-Time Passcode</Label>
                <Input
                  id="admin-otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter code from your email"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? 'Please wait...' : step === 'request' ? 'Send Admin OTP' : 'Verify Admin OTP'}
            </Button>

            {step === 'verify' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep('request');
                  setOtpCode('');
                  setInfoMessage(null);
                  setErrorMessage(null);
                }}
              >
                Use different email
              </Button>
            )}
          </form>

          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={() => router.push('/login')} className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
            <Button variant="link" onClick={() => router.push('/')} className="text-sm text-slate-500">
              Need help?
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
