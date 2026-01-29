'use client';

import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { JobParameters } from '@/types/job';
import { parseJobParameters } from '@/services/jobParser';

/**
 * Custom hook to manage job chat state and logic
 * Extracted from component for testability and reusability
 */
export function useJobChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "Hello! I'm here to help you create a job request. What type of trade professional do you need?",
      timestamp: new Date().toISOString(),
    },
  ]);

  const [jobParams, setJobParams] = useState<JobParameters>({});
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsTyping(true);

      // Simulate AI response with delay
      // TODO: Replace with actual API call to services/jobChatApi.ts
      setTimeout(() => {
        const { params, response } = parseJobParameters(content, jobParams);
        
        setJobParams(params);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 1000);
    },
    [jobParams]
  );

  const updateInputValue = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const isJobComplete = useCallback(() => {
    return !!(
      jobParams.tradeType &&
      jobParams.location &&
      jobParams.workersNeeded &&
      jobParams.startDate &&
      jobParams.description
    );
  }, [jobParams]);

  return {
    messages,
    jobParams,
    isTyping,
    inputValue,
    sendMessage,
    updateInputValue,
    isJobComplete,
  };
}
