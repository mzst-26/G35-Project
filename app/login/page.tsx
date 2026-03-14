"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Building2, Wrench, ArrowRight, Shield } from 'lucide-react';

import { AuthApiError, requestOtp, verifyOtp } from '@/lib/auth/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LoginRoleTab = 'company' | 'trade';

interface LoginScreenProps {
  onLogin?: (role: 'recruiter' | 'trade') => void;
}

function routeForRole(role: 'admin' | 'recruiter' | 'trade') {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'recruiter') return '/company/dashboard/home';
  return '/trade/dashboard';
}

export default function LoginScreen({ onLogin }: LoginScreenProps = {}) {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [role, setRole] = useState<LoginRoleTab>('company');
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
      setInfoMessage('We sent a one-time code to your email.');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to request OTP right now. Please try again.');
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

      await refreshUser();

      if (session.user.role === 'admin') {
        setErrorMessage('Admin accounts must use Admin Access login.');
        return;
      }

      if (onLogin) {
        onLogin(session.user.role);
      }

      router.push(routeForRole(session.user.role));
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to verify OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const moveBackToRequest = () => {
    setStep('request');
    setOtpCode('');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const isCompanyTab = role === 'company';
  const roleLabel = isCompanyTab ? 'Recruiter' : 'Trade';
  const tabEmailId = isCompanyTab ? 'company-email' : 'trade-email';
  const tabEmailPlaceholder = isCompanyTab ? 'company@example.com' : 'tradesperson@example.com';
  const showRequestButton = step === 'request';
  const onSubmit = showRequestButton ? handleRequestOtp : handleVerifyOtp;

  const renderStepContent = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor={tabEmailId}>Email</Label>
        <Input
          id={tabEmailId}
          type="email"
          placeholder={tabEmailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white"
          disabled={step === 'verify'}
        />
      </div>

      {step === 'verify' && (
        <div className="space-y-2">
          <Label htmlFor="otp-code">One-Time Passcode</Label>
          <Input
            id="otp-code"
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

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={isLoading || (showRequestButton ? !email.trim() : !otpCode.trim())}
      >
        {isLoading ? 'Please wait...' : showRequestButton ? `Send OTP for ${roleLabel}` : `Verify OTP for ${roleLabel}`}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>

      {step === 'verify' && (
        <Button type="button" variant="outline" className="w-full" onClick={moveBackToRequest}>
          Use different email
        </Button>
      )}
    </>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex-col">
      <div className="flex items-center justify-center gap-3 mb-6" >
        <div className="h-15 w-15 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl">
          <Image src="/logoCrisp.png" alt="Infra logo" width={56} height={56} className="rounded-xl" />
        </div>

        <div>
          <h1 className="text-3xl text-white">Infra</h1>
          <p className="text-blue-300 text-sm">Connect. Work. Succeed.</p>
        </div>
      </div>

      <Card className="bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={role}
            onValueChange={(value: string) => {
              setRole(value as LoginRoleTab);
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-300/60 backdrop-blur-xl rounded-full">
              <TabsTrigger value='company' className="flex items-center gap-2 rounded-full">
                <Building2 className="h-4 w-4" />
                Recruiter
              </TabsTrigger>
              <TabsTrigger value='trade' className="flex items-center gap-2 rounded-full">
                <Wrench className="h-4 w-4" />
                Trade
              </TabsTrigger>
            </TabsList>

            {infoMessage && (
              <p className="text-sm text-emerald-700 mb-3">{infoMessage}</p>
            )}

            {errorMessage && (
              <p className="text-sm text-rose-600 mb-3">{errorMessage}</p>
            )}

            <form onSubmit={onSubmit}>
              <TabsContent value='company' className="space-y-4 mt-0 ">
                {renderStepContent()}
              </TabsContent>

              <TabsContent value='trade' className="space-y-4 mt-0">
                {renderStepContent()}
              </TabsContent>
            </form>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">
                    New to Infra?
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/login/register/recruiter')}
                  className="w-full"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Register Company
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/login/register/trade')}
                  className="w-full"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Register Trade
                </Button>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        onClick={() => router.push('/login/adminLogin')}
        className="text-blue-200 hover:text-white hover:bg-white/10 mt-10"
      >
        <Shield className="h-4 w-4 mr-2" />
        Admin Access
      </Button>
    </div>
  );
}
