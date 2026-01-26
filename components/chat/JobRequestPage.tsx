'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { JobParametersPanel } from '@/components/chat/JobParametersPanel';
import { useJobChat } from '@/hooks/useJobChat';

interface JobRequestPageProps {
  onBack: () => void;
  onSubmit?: (jobParams: any) => void;
}

export function JobRequestPage({ onBack, onSubmit }: JobRequestPageProps) {
  const {
    messages,
    jobParams,
    isTyping,
    inputValue,
    sendMessage,
    updateInputValue,
    isJobComplete,
  } = useJobChat();

  const [showAllocation, setShowAllocation] = useState(false);

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(jobParams);
    } else {
      setShowAllocation(true);
    }
  };

  // If showing allocation, render allocation component
  if (showAllocation) {
    // TODO: Import and render AllocationSidebar or redirect to allocation page
    return (
      <div className="p-8">
        <p className="text-lg">Allocation view - to be implemented</p>
        <Button onClick={() => setShowAllocation(false)} className="mt-4">
          Back to Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ChatInterface
              messages={messages}
              isTyping={isTyping}
              inputValue={inputValue}
              onInputChange={updateInputValue}
              onSendMessage={() => sendMessage(inputValue)}
            />
          </div>

          {/* Job Parameters Panel - Takes 1 column on large screens */}
          <div>
            <JobParametersPanel
              jobParams={jobParams}
              isComplete={isJobComplete()}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
