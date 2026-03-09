/**
 * jobParser.ts - Extracts job parameters from user messages
 * 
 * Pure function that analyzes user input and extracts job information.
 * Uses regex patterns to match trade types, locations, dates, etc.
 * 
 * Note: This is placeholder logic. Will be replaced with actual AI/NLP backend.
 */

import { JobParameters } from '@/types/job';

/**
 * Parse user message and extract job parameters
 * @param userMessage - Text entered by user
 * @param currentParams - Previously extracted parameters
 * @returns Updated parameters and AI response text
 */
export function parseJobParameters(
  userMessage: string,
  currentParams: JobParameters
): { params: JobParameters; response: string } {
  const newParams = { ...currentParams }; // Copy existing params
  let response = '';

  // Trade type extraction - check for job types in message
  if (!newParams.tradeType && /electrician|plumber|carpenter|painter/i.test(userMessage)) {
    const match = userMessage.match(/electrician|plumber|carpenter|painter/i);
    if (match) {
      newParams.tradeType = match[0].toLowerCase();
      response = `Great! I've noted you need a ${match[0]}. Where is the job location?`;
    }
  }
  // Location extraction - check for city names
  else if (!newParams.location && /london|manchester|birmingham|postcode/i.test(userMessage)) {
    newParams.location = userMessage;
    response = `Location noted. How many workers do you need for this job?`;
  }
  // Workers needed extraction - look for numbers
  else if (!newParams.workersNeeded && /\d+/.test(userMessage)) {
    const match = userMessage.match(/\d+/);
    if (match) {
      newParams.workersNeeded = parseInt(match[0]);
      response = `Perfect, ${match[0]} worker${match[0] !== '1' ? 's' : ''}. When do you need them to start?`;
    }
  }
  // Start date extraction - check for date formats
  else if (
    !newParams.startDate &&
    /monday|tuesday|next week|tomorrow|\d{4}-\d{2}-\d{2}|25th|26th/i.test(userMessage)
  ) {
    newParams.startDate = userMessage;
    response = `Got it. Can you describe what work needs to be done?`;
  }
  // Description extraction - capture remaining text
  else if (!newParams.description) {
    newParams.description = userMessage;
    response = `Excellent! I've gathered all the information. Would you like to submit this job request?`;
  }
  // Default response - all parameters collected
  else {
    response = `I've captured all the details. Ready to find the best trade professional for your job!`;
  }

  return { params: newParams, response };
}
