'use client';

import { useState, useCallback, useRef } from 'react';
import { Message } from '@/types/chat';
import { JobParameters } from '@/types/job';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';

const ALLOWED_TRADES = [
  'carpenter',
  'electrician',
  'plumber',
  'painter',
  'bricklayer',
  'roofer',
] as const;

const ALLOWED_LOCATIONS = [
  'london',
  'manchester',
  'birmingham',
  'leeds',
  'liverpool',
  'bristol',
] as const;

const MIN_WORKERS = 1;
const MAX_WORKERS = 200;
const MIN_NOTES_LENGTH = 10;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

interface ParseResult {
  params: JobParameters;
  response: string;
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function hasTrade(value: string): string | null {
  for (const trade of ALLOWED_TRADES) {
    const expression = new RegExp(`\\b${trade}\\b`, 'i');
    if (expression.test(value)) {
      return trade;
    }
  }
  return null;
}

function hasLocation(value: string): string | null {
  for (const location of ALLOWED_LOCATIONS) {
    const expression = new RegExp(`\\b${location}\\b`, 'i');
    if (expression.test(value)) {
      return location;
    }
  }
  return null;
}

function extractWorkersNeeded(value: string): number | null {
  const explicitMatch = value.match(/workers?\s*(needed)?\s*[:=]?\s*(-?\d{1,3})/i);
  if (explicitMatch?.[2]) {
    return Number.parseInt(explicitMatch[2], 10);
  }

  const quantityMatch = value.match(/(-?\d{1,3})\s+(workers?|people|tradespeople|staff)\b/i);
  if (quantityMatch?.[1]) {
    return Number.parseInt(quantityMatch[1], 10);
  }

  const standaloneNumber = value.match(/^\s*(-?\d{1,3})\s*$/);
  if (standaloneNumber?.[1]) {
    return Number.parseInt(standaloneNumber[1], 10);
  }

  const wordOnly = value.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, wordOnly)) {
    return NUMBER_WORDS[wordOnly];
  }

  return null;
}

function normalizeDate(candidate: string, now: Date): string | null {
  const normalized = candidate.trim();
  if (!normalized) {
    return null;
  }

  if (/^tomorrow$/i.test(normalized)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  if (/^today$/i.test(normalized)) {
    return now.toISOString().slice(0, 10);
  }

  const isoLike = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/);
  const slashLike = normalized.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  const source = isoLike?.[0] ?? slashLike?.[0] ?? normalized;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function extractStartDate(value: string, now: Date): string | null {
  const labelMatch = value.match(/(?:start\s*date|start|starting)\s*[:=-]?\s*([^,.!;]+)/i);
  if (labelMatch?.[1]) {
    return normalizeDate(labelMatch[1], now);
  }

  const isoMatch = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch?.[0]) {
    return normalizeDate(isoMatch[0], now);
  }

  const slashMatch = value.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  if (slashMatch?.[0]) {
    return normalizeDate(slashMatch[0], now);
  }

  if (/\btomorrow\b/i.test(value)) {
    return normalizeDate('tomorrow', now);
  }

  if (/\btoday\b/i.test(value)) {
    return normalizeDate('today', now);
  }

  return null;
}

function extractNotes(value: string): string | null {
  const labeled = value.match(/(?:notes?|description|scope)\s*[:=-]\s*(.+)$/i);
  if (labeled?.[1]) {
    return labeled[1].trim();
  }

  const clean = value.trim();
  if (clean.length >= MIN_NOTES_LENGTH && /\bnote\b|\bnotes\b/i.test(value)) {
    return clean;
  }

  return null;
}

function isDateInPast(isoDate: string, now: Date): boolean {
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < current.getTime();
}

function getNextMissingField(params: JobParameters): string {
  if (!params.tradeType) return 'trade type';
  if (!params.location) return 'location';
  if (!params.workersNeeded) return 'workers needed';
  if (!params.startDate) return 'start date';
  if (!params.description) return 'job notes';
  return 'none';
}

function buildSuccessResponse(params: JobParameters): string {
  const missingField = getNextMissingField(params);
  if (missingField === 'none') {
    return 'Great, all required job details are set. You can now review and approve the estimate.';
  }

  if (missingField === 'trade type') {
    return `Please provide the trade type. Allowed options: ${ALLOWED_TRADES.join(', ')}.`;
  }

  if (missingField === 'location') {
    return `Please provide the location. Allowed options: ${ALLOWED_LOCATIONS.join(', ')}.`;
  }

  if (missingField === 'workers needed') {
    return `How many workers do you need? Enter a whole number between ${MIN_WORKERS} and ${MAX_WORKERS}.`;
  }

  if (missingField === 'start date') {
    return 'What is the start date? Use YYYY-MM-DD, DD/MM/YYYY, today, or tomorrow.';
  }

  return `Add job notes with at least ${MIN_NOTES_LENGTH} characters. Example: notes: indoor fit-out and safety induction required.`;
}

function parseJobMessage(content: string, currentParams: JobParameters, now: Date = new Date()): ParseResult {
  const normalizedContent = normalizeText(content);
  const nextParams: JobParameters = { ...currentParams };
  const errors: string[] = [];

  const trade = hasTrade(normalizedContent);
  if (trade) {
    nextParams.tradeType = trade;
  } else if (/\btrade\b/i.test(content) && !nextParams.tradeType) {
    errors.push(`Trade type must be one of: ${ALLOWED_TRADES.join(', ')}.`);
  }

  const location = hasLocation(normalizedContent);
  if (location) {
    nextParams.location = titleCase(location);
  } else if (/\blocation\b|\bin\b/i.test(content) && !nextParams.location) {
    errors.push(`Location must be one of: ${ALLOWED_LOCATIONS.join(', ')}.`);
  }

  const workers = extractWorkersNeeded(content);
  if (workers !== null) {
    if (!Number.isInteger(workers) || workers < MIN_WORKERS || workers > MAX_WORKERS) {
      errors.push(`Workers needed must be a whole number between ${MIN_WORKERS} and ${MAX_WORKERS}.`);
    } else {
      nextParams.workersNeeded = workers;
    }
  }

  const startDate = extractStartDate(content, now);
  if (startDate) {
    if (isDateInPast(startDate, now)) {
      errors.push('Start date cannot be in the past.');
    } else {
      nextParams.startDate = startDate;
    }
  } else if (/\bstart\b|\bdate\b|\bstarting\b/i.test(content) && !nextParams.startDate) {
    errors.push('Start date must be a valid date (YYYY-MM-DD, DD/MM/YYYY, today, or tomorrow).');
  }

  const notes = extractNotes(content);
  const expectsNotesNow = Boolean(
    nextParams.tradeType
      && nextParams.location
      && nextParams.workersNeeded
      && nextParams.startDate
      && !nextParams.description,
  );

  if (notes) {
    if (notes.trim().length < MIN_NOTES_LENGTH) {
      errors.push(`Job notes must be at least ${MIN_NOTES_LENGTH} characters.`);
    } else {
      nextParams.description = notes.trim();
    }
  } else if (expectsNotesNow) {
    const plainNotes = content.trim();
    if (plainNotes.length < MIN_NOTES_LENGTH) {
      errors.push(`Job notes must be at least ${MIN_NOTES_LENGTH} characters.`);
    } else {
      nextParams.description = plainNotes;
    }
  } else if (/\bnotes?\b|\bdescription\b|\bscope\b/i.test(content) && !nextParams.description) {
    errors.push(`Job notes must be at least ${MIN_NOTES_LENGTH} characters.`);
  }

  if (errors.length > 0) {
    return {
      params: nextParams,
      response: `${errors.join(' ')} ${buildSuccessResponse(nextParams)}`,
    };
  }

  return {
    params: nextParams,
    response: buildSuccessResponse(nextParams),
  };
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
  const jobParamsRef = useRef<JobParameters>({});
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
        const { params, response } = parseJobMessage(content, jobParamsRef.current);
        jobParamsRef.current = params;
        setJobParams(params);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (caughtError) {
        captureFrontendError(caughtError, {
          flow: 'job_chat',
          action: 'local_parse',
          role: 'recruiter',
        });

        captureFrontendMessage('Job chat local parser failed', {
          flow: 'job_chat',
          action: 'local_parse',
          role: 'recruiter',
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
    []
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
