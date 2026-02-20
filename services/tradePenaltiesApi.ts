// Mock Trade Penalties API Service
// TODO: later will replace this with the real API calls to backend

import type { TradePenalty } from '@/types/trade-dashboard';

// Mock penalties data - TODO: Replace with API call
const mockPenalties: TradePenalty[] = [
  {
    id: 1,
    reason: 'Job Rejection',
    amount: 50,
    date: '2026-01-15',
    status: 'unpaid',
    description: 'Penalty applied for rejecting accepted job offer',
    referenceJob: 'Emergency Repair - Retail Solutions',
  },
  {
    id: 2,
    reason: 'Late Arrival',
    amount: 120,
    date: '2025-11-21',
    status: 'paid',
    description: 'Penalty applied for arriving 45 minutes late to scheduled job',
    referenceJob: 'Office Lighting Upgrade - Business Solutions Ltd',
  },
  {
    id: 3,
    reason: 'Missing Documentation',
    amount: 30,
    date: '2025-09-12',
    status: 'disputed',
    description: 'Penalty for incomplete paperwork submission. Currently under review.',
    referenceJob: 'Residential Installation - Property Group',
  },
];

/**
 * Fetch all penalties for the current trade user
 * @returns Promise resolving to array of TradePenalty records
 */
export async function getTradePenalties(): Promise<TradePenalty[]> {
  // TODO: Replace with real API call.
  // Example: return fetch('/api/trade/penalties').then(r => r.json());
  return Promise.resolve(mockPenalties);
}

/**
 * Get penalty by ID
 * @param penaltyId - ID of penalty to retrieve
 * @returns Promise resolving to TradePenalty or null if not found
 */
export async function getTradePenaltyById(penaltyId: number): Promise<TradePenalty | null> {
  // TODO: Replace with real API call
  const penalty = mockPenalties.find((p) => p.id === penaltyId);
  return Promise.resolve(penalty || null);
}

/**
 * Submit appeal for a disputed penalty
 * @param penaltyId - ID of penalty to appeal
 * @param reason - Reason for appeal
 * @returns Promise resolving to success status
 */
export async function submitPenaltyAppeal(penaltyId: number, reason: string): Promise<boolean> {
  // TODO: Replace with real API call
  console.log(`Appeal submitted for penalty ${penaltyId}: ${reason}`);
  return Promise.resolve(true);
}

/**
 * Pay a penalty
 * @param penaltyId - ID of penalty to pay
 * @returns Promise resolving to success status
 */
export async function payPenalty(penaltyId: number): Promise<boolean> {
  // TODO: Replace with real API call to process payment
  console.log(`Payment initiated for penalty ${penaltyId}`);
  return Promise.resolve(true);
}
