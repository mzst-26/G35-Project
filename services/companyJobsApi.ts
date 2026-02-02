import type { CompanyJob } from '@/types/company-jobs';

// Placeholder API layer for company jobs.
// Replace mock data with real HTTP calls when backend is available.

const MOCK_JOBS: CompanyJob[] = [
  {
    id: '1',
    title: 'Office Electrical Rewiring',
    trade: 'Electrician',
    status: 'in-progress',
    workers: 2,
    date: '2025-11-25',
    location: 'London, EC1',
  },
  {
    id: '2',
    title: 'Bathroom Plumbing Installation',
    trade: 'Plumber',
    status: 'allocated',
    workers: 1,
    date: '2025-11-28',
    location: 'Manchester, M1',
  },
  {
    id: '3',
    title: 'Kitchen Cabinet Installation',
    trade: 'Carpenter',
    status: 'pending',
    workers: 2,
    date: '2025-12-01',
    location: 'Birmingham, B1',
  },
  {
    id: '4',
    title: 'Warehouse Painting',
    trade: 'Painter',
    status: 'completed',
    workers: 3,
    date: '2025-11-20',
    location: 'Leeds, LS1',
  },
];

export async function listRecentCompanyJobs(): Promise<CompanyJob[]> {
  // TODO: Replace with real API call.
  return Promise.resolve(MOCK_JOBS);
}
