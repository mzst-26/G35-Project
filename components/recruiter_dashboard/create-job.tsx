"use client";

import { Plus, MessageSquare, FileText, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateJobHomeProps } from "@/types/dashboard";

export default function CreateJobHome({
  onAIChat,
  onManualForm,
}: CreateJobHomeProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-slate-900 mb-2">Create a Job Request</h1>
        <p className="text-slate-600">Choose how you&apos;d like to get started</p>
      </div>

      {/* OPTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {/* AI Chat Option */}
        <Card className="border-2 border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg cursor-pointer group">
          <CardHeader>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
              <MessageSquare className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <CardTitle className="flex items-center gap-2">
              Chat with AI
              <Plus className="h-5 w-5 text-yellow-500" />
            </CardTitle>
            <CardDescription>
              Have a conversation to create your job request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Our AI assistant will ask questions and automatically fill job details.
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Natural conversation flow</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Real-time job preview</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Smart suggestions</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">~2-3 minutes</span>
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={onAIChat}
            >
              Start AI Chat
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Manual Form Option */}
        <Card className="border-2 border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg cursor-pointer group">
          <CardHeader>
            <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
              <FileText className="h-6 w-6 text-slate-600 group-hover:text-white transition-colors" />
            </div>
            <CardTitle>Manual Form</CardTitle>
            <CardDescription>
              Fill out a structured form with job details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Great if you already know exactly what you need.
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">All fields in one place</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">Quick and straightforward</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">~3-5 minutes</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={onManualForm}>
              Use Manual Form
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Helper Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-5xl">
        <p className="text-sm text-slate-700">
          <strong>Not sure which to choose?</strong>  
          AI chat is great for complex jobs, while manual form is fastest if you have all details ready.
        </p>
      </div>
    </div>
  );
}
