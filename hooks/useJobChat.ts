'use client';

import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { JobParameters } from '@/types/job';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { parseJsonOrThrowEnvelope, toHookApiError } from '@/lib/core/error-envelope';

interface ChatParseResponse {
  params: JobParameters;
  response: string;
}

async function requestChatParse(
  content: string,
  currentParams: JobParameters,
): Promise<ChatParseResponse> {
  const response = await fetch('/api/core/chat/parse', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: content,
      currentParams,
    }),
  });

  return parseJsonOrThrowEnvelope<ChatParseResponse>(
    response,
    'Unable to process your message right now.',
    'JOB_CHAT_PARSE_FAILED',
  );
}

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
    async (content: string) => {
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

      try {
        const { params, response } = await requestChatParse(content, jobParams);
        setJobParams(params);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (caughtError) {
        const apiError = toHookApiError(
          caughtError,
          'Unable to process your message right now.',
          'JOB_CHAT_PARSE_FAILED',
        );

        captureFrontendError(apiError, {
          flow: 'job_chat',
          endpoint: '/api/core/chat/parse',
          action: 'parse',
          role: 'recruiter',
        });

        captureFrontendMessage('Job chat parse request failed', {
          flow: 'job_chat',
          endpoint: '/api/core/chat/parse',
          action: 'parse',
          role: 'recruiter',
          extra: {
            code: apiError.envelope.code,
            requestId: apiError.envelope.requestId,
            status: apiError.envelope.status,
          },
        });

        const fallbackAssistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'I could not process that message right now. Please try again in a moment.',
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, fallbackAssistantMessage]);
      } finally {
        setIsTyping(false);
      }
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
