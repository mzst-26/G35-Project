import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobParametersPanel } from '@/components/chat/JobParametersPanel';
import type { JobParameters } from '@/types/job';

const completeParams: JobParameters = {
  tradeType: 'electrician',
  location: 'London',
  workersNeeded: 2,
  startDate: '2026-04-03',
  description: 'Shop fit-out and safety induction required.',
};

describe('JobParametersPanel', () => {
  it('hides pricing and submit controls until required fields are complete', () => {
    render(
      <JobParametersPanel
        jobParams={{}}
        isComplete={false}
        onSubmit={vi.fn()}
        isPriceApproved={false}
        onPriceApprovalChange={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByText('Estimated Cost')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve Price & Create Job' })).not.toBeInTheDocument();
  });

  it('shows estimate and requires explicit approval before enabling create action', () => {
    const onSubmit = vi.fn();
    const onPriceApprovalChange = vi.fn();

    const { rerender } = render(
      <JobParametersPanel
        jobParams={completeParams}
        isComplete={true}
        onSubmit={onSubmit}
        isPriceApproved={false}
        onPriceApprovalChange={onPriceApprovalChange}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    expect(screen.getByText('Labour Cost')).toBeInTheDocument();
    expect(screen.getByText('Platform Fee (10%)')).toBeInTheDocument();
    expect(screen.getByText('Total Estimate')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onPriceApprovalChange).toHaveBeenCalledWith(true);

    const createButton = screen.getByRole('button', { name: 'Approve Price & Create Job' });
    expect(createButton).toBeDisabled();

    rerender(
      <JobParametersPanel
        jobParams={completeParams}
        isComplete={true}
        onSubmit={onSubmit}
        isPriceApproved={true}
        onPriceApprovalChange={onPriceApprovalChange}
        isSubmitting={false}
      />,
    );

    const enabledButton = screen.getByRole('button', { name: 'Approve Price & Create Job' });
    expect(enabledButton).not.toBeDisabled();

    fireEvent.click(enabledButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
