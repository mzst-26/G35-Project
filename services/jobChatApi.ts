/**
 * jobChatApi.ts - API service for backend integration
 * 
 * Marked with 'use server' - runs only on server, not in browser.
 * Contains placeholder functions for backend API calls.
 * 
 * TODO: Replace all throw statements with actual fetch() calls to backend.
 */

'use server';

import { Message } from '@/types/chat';
import { JobParameters } from '@/types/job';

// Environment variables for API endpoints
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
// const AI_ENDPOINT = process.env.NEXT_PUBLIC_AI_ENDPOINT || '/ai/chat';

/**
 * Send message to AI backend
 * TODO: Replace with actual API call
 * 
 * @param message - User's message text
 * @param jobParams - Current job parameters
 * @returns AI response and updated parameters
 */
export async function sendChatMessage(
  message: string,
  jobParams: JobParameters
): Promise<{ response: string; updatedParams: JobParameters }> {
  // PLACEHOLDER: Replace with actual backend call
  // return response.json();

  throw new Error('Backend integration pending: sendChatMessage not implemented');
}

/**
 * Submit completed job request to backend
 * TODO: Replace with actual API call
 * 
 * @param jobParams - Complete job parameters
 * @returns Job ID from backend
 */
export async function submitJobRequest(jobParams: JobParameters): Promise<{ jobId: string }> {
  // PLACEHOLDER: Replace with actual backend call
  throw new Error('Backend integration pending: submitJobRequest not implemented');
}

/**
 * Get chat history for a session
 * TODO: Replace with actual API call
 * 
 * @param sessionId - Chat session identifier
 * @returns Array of previous messages
 */
export async function getChatHistory(sessionId: string): Promise<Message[]> {
  // PLACEHOLDER: Replace with actual backend call
  throw new Error('Backend integration pending: getChatHistory not implemented');
}
