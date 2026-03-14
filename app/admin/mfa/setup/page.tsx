'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Copy, Check, Loader2 } from 'lucide-react';

import { mfaEnroll, mfaChallenge, mfaVerify, mfaCompleteAdminLogin, AuthApiError } from '@/lib/auth/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SetupStep = 'loading' | 'scan' | 'verify' | 'error';

export default function AdminMfaSetupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<SetupStep>('loading');
  const [factorId, setFactorId] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Enroll on mount — the temporary sb-access-token cookie is already set from OTP verify.
  useEffect(() => {
    let cancelled = false;

    async function enroll() {
      try {
        const result = await mfaEnroll();
        if (cancelled) return;
        setFactorId(result.factorId);
        setTotpSecret(result.totpSecret);
        setTotpUri(result.totpUri);
        setStep('scan');
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof AuthApiError ? err.message : 'Failed to start MFA setup. Please go back and try again.';
        setErrorMessage(message);
        setStep('error');
      }
    }

    enroll();
    return () => { cancelled = true; };
  }, []);

  // Render the QR code onto a canvas once we have the TOTP URI.
  useEffect(() => {
    if (!totpUri || !canvasRef.current) return;

    // Dynamically import qrcode only in the browser.
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, totpUri, { width: 200, margin: 2 }, (err) => {
        if (err) console.error('[mfa-setup] QR render error', err);
      });
    }).catch(() => {
      // qrcode not installed — the user can still use the manual secret below.
    });
  }, [totpUri]);

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceedToVerify = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const challenge = await mfaChallenge(factorId);
      setChallengeId(challenge.challengeId);
      setStep('verify');
    } catch (err) {
      setErrorMessage(err instanceof AuthApiError ? err.message : 'Failed to create challenge. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await mfaVerify(factorId, challengeId, code.trim());
      await mfaCompleteAdminLogin();
      await refreshUser();
      router.push('/admin/dashboard');
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : 'Verification failed. Check your code and try again.';
      setErrorMessage(message);
      // Refresh the challenge so the code window is valid.
      try {
        const fresh = await mfaChallenge(factorId);
        setChallengeId(fresh.challengeId);
      } catch { /* non-fatal */ }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Card className="bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Set up two-factor authentication</CardTitle>
              <CardDescription>Required once for all admin accounts</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Preparing authenticator setup…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-rose-600">{errorMessage}</p>
              <Button variant="outline" className="w-full" onClick={() => router.push('/login/adminLogin')}>
                Back to login
              </Button>
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">
                Scan the QR code with Google Authenticator, Authy, or any TOTP app.
                If you can&apos;t scan, copy the secret key and enter it manually.
              </p>

              <div className="flex justify-center">
                <canvas ref={canvasRef} className="rounded border border-slate-200" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Manual entry key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-slate-100 rounded px-3 py-2 font-mono break-all select-all">
                    {totpSecret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopySecret}
                    title="Copy secret"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleProceedToVerify}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Please wait…' : 'I\'ve scanned the code — continue'}
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>

              <div className="space-y-2">
                <Label htmlFor="totp-code">Authenticator code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="tracking-widest text-center text-lg font-mono bg-white"
                  autoFocus
                  required
                />
              </div>

              {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting || code.length < 6}
              >
                {isSubmitting ? 'Verifying…' : 'Confirm and sign in'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setStep('scan')}
                disabled={isSubmitting}
              >
                Back to QR code
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
