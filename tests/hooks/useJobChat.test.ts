import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobChat } from '@/hooks/useJobChat';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

describe('useJobChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses valid guided inputs locally and populates all required fields', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useJobChat());

    await act(async () => {
      await result.current.sendMessage('trade type carpenter');
      await result.current.sendMessage('location london');
      await result.current.sendMessage('workers needed 3');
      await result.current.sendMessage('start date tomorrow');
      await result.current.sendMessage('notes: shop refit with safety briefing required');
    });

    expect(fetchSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false);
    });

    expect(result.current.jobParams.tradeType).toBe('carpenter');
    expect(result.current.jobParams.location).toBe('London');
    expect(result.current.jobParams.workersNeeded).toBe(3);
    expect(result.current.jobParams.startDate).toBeTruthy();
    expect(result.current.jobParams.description).toBe('shop refit with safety briefing required');
    expect(result.current.isJobComplete()).toBe(true);

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.content).toContain('all required job details are set');
  });

  it('returns validation guidance for invalid values and keeps missing fields unset', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useJobChat());

    await act(async () => {
      await result.current.sendMessage('trade type welder location paris workers needed -2 start date 2020-01-01 notes: short');
    });

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false);
    });

    expect(result.current.jobParams.tradeType).toBeUndefined();
    expect(result.current.jobParams.location).toBeUndefined();
    expect(result.current.jobParams.workersNeeded).toBeUndefined();
    expect(result.current.jobParams.startDate).toBeUndefined();
    expect(result.current.jobParams.description).toBeUndefined();

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.role).toBe('assistant');
    expect(lastMessage.content).toContain('Trade type must be one of');
    expect(lastMessage.content).toContain('Location must be one of');
    expect(lastMessage.content).toContain('Start date cannot be in the past');
    expect(lastMessage.content).toContain('Please provide the trade type');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts standalone workers input and advances prompt', async () => {
    const { result } = renderHook(() => useJobChat());

    await act(async () => {
      await result.current.sendMessage('carpenter');
      await result.current.sendMessage('london');
      await result.current.sendMessage('2');
    });

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false);
    });

    expect(result.current.jobParams.workersNeeded).toBe(2);
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.content).toContain('What is the start date');
  });

  it('accepts plain text notes without label when notes are expected', async () => {
    const { result } = renderHook(() => useJobChat());

    await act(async () => {
      await result.current.sendMessage('carpenter');
      await result.current.sendMessage('london');
      await result.current.sendMessage('2');
      await result.current.sendMessage('tomorrow');
      await result.current.sendMessage('Kitchen installation and safety induction required');
    });

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false);
    });

    expect(result.current.jobParams.description).toBe('Kitchen installation and safety induction required');
    expect(result.current.isJobComplete()).toBe(true);

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.content).toContain('all required job details are set');
  });
});
