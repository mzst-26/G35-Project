import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApplicationReviewPage from '@/app/admin/dashboard/applications/[applicationId]/page';

const reviewApplicationMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ applicationId: '11111111-1111-1111-1111-111111111111' }),
}));

vi.mock('@/hooks/useApplications', () => ({
  useApplications: () => ({
    applications: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        applicantName: 'Northline Build Ltd',
        type: 'recruiter',
        submittedAt: '2026-03-06T00:00:00.000Z',
        status: 'pending',
        recruiterDetails: {
          companyName: 'Northline Build Ltd',
          requesterFullName: 'Jamie Carter',
          requesterEmail: 'jamie@example.com',
          requesterPhone: '+44 20 5555 0123',
          requesterRoleTitle: 'Director',
          officeAddressLine1: '10 Fleet Street',
          officeAddressLine2: null,
          officeCity: 'London',
          officePostcode: 'EC4Y 1AA',
          companyWebsite: null,
          requestedSeatCount: 10,
          hasInternalApprover: false,
          internalApproverFullName: null,
          internalApproverEmail: null,
          contractSignerSameAsRequester: true,
          contractSignerFullName: null,
          contractSignerEmail: null,
        },
      },
    ],
    getApplicationById: (applicationId: string) =>
      applicationId === '11111111-1111-1111-1111-111111111111'
        ? {
            id: '11111111-1111-1111-1111-111111111111',
            applicantName: 'Northline Build Ltd',
            type: 'recruiter',
            submittedAt: '2026-03-06T00:00:00.000Z',
            status: 'pending',
            recruiterDetails: {
              companyName: 'Northline Build Ltd',
              requesterFullName: 'Jamie Carter',
              requesterEmail: 'jamie@example.com',
              requesterPhone: '+44 20 5555 0123',
              requesterRoleTitle: 'Director',
              officeAddressLine1: '10 Fleet Street',
              officeAddressLine2: null,
              officeCity: 'London',
              officePostcode: 'EC4Y 1AA',
              companyWebsite: null,
              requestedSeatCount: 10,
              hasInternalApprover: false,
              internalApproverFullName: null,
              internalApproverEmail: null,
              contractSignerSameAsRequester: true,
              contractSignerFullName: null,
              contractSignerEmail: null,
            },
          }
        : undefined,
    reviewApplication: reviewApplicationMock,
    isLoading: false,
    isMutating: false,
    error: null,
  }),
}));

describe('Application review page', () => {
  beforeEach(() => {
    reviewApplicationMock.mockReset();
    reviewApplicationMock.mockResolvedValue(undefined);
  });

  it('submits approve decision with reason', async () => {
    render(<ApplicationReviewPage />);

    fireEvent.click(screen.getAllByLabelText(/Approve application/i)[0]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Verified all documents.' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Decision/i }));

    await waitFor(() => {
      expect(reviewApplicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: 'approved',
          reason: 'Verified all documents.',
        }),
      );
    });
  });
});
