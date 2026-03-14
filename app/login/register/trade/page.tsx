"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
  TradeRegistrationFormFields,
  TradeRegistrationPayload,
  TradeRegistrationSubmit,
} from "@/types/trade-registration";

export default function TradeRegisterPage() { //background wrapper, handles when form is submitted and back button pressed
  const router = useRouter();
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmitPage = (payload: TradeRegistrationPayload) => { //handles when form is submitted
    console.log("page received payload", payload);
    setSubmitted(true);
  };

  function TradeRegistration({ onSubmit }: { onSubmit?: TradeRegistrationSubmit }) { //the actual trade registration form
    const [form, setForm] = React.useState<TradeRegistrationFormFields>({ name: "", occupation: "", address: "", references: "" });  //state for form fields
    const [qualFile, setQualFile] = React.useState<File | null>(null); //single file
    const [photoFiles, setPhotoFiles] = React.useState<FileList | null>(null); //multiple files

    const handleChange = (field: keyof TradeRegistrationFormFields, value: string) => //updates form state when input changes
      setForm(prev => ({ ...prev, [field]: value })); 

    const handleSubmit = (e: React.FormEvent) => { //handles when form is submitted
      e.preventDefault();
      const payload: TradeRegistrationPayload = { ...form, qualifications: qualFile, photos: photoFiles };
      if (onSubmit) onSubmit(payload);
      else console.log("Trade registration (UI only)", payload);
    };

    return (
      <Card className="max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4"/><path d="M10 3v4"/><path d="M3 11h18"/><path d="M5 21h14a2 2 0 0 0 2-2V11H3v8a2 2 0 0 0 2 2z"/></svg>
            </div>
            <div>
              <CardTitle className="text-2xl">Trade Registration</CardTitle>
              <div className="text-sm text-slate-500">Register to offer your trade services</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" value={form.occupation} onChange={(e) => handleChange('occupation', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="references">References</Label>
              <textarea id="references" value={form.references} onChange={(e) => handleChange('references', e.target.value)} className="w-full min-h-[96px] rounded-md border bg-transparent border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <Label htmlFor="qualifications">Qualifications (PDF/DOC)</Label>
              <Input id="qualifications" type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setQualFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <div>
              <Label htmlFor="photos">Photos of work (images)</Label>
              <Input id="photos" type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(e.target.files)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Request Trade Access</Button>
            </div>
          </form>

          {submitted && (
            <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              Access request submitted. An admin must approve your account before OTP login is available.
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={() => router.push('/login')}>
                  Back to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex-col">
      <div className="max-w-2xl mx-auto py-8 w-full px-4">
        <Button variant="ghost" className="mb-4 text-white/90" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>

        <TradeRegistration onSubmit={handleSubmitPage} />
      </div>
    </div>
  );
}