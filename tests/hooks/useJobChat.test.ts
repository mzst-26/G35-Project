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

  it('sends message to /api/core/chat/parse and updates assistant response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            params: {
              tradeType: 'electrician',
            },
            response: 'Great, I noted electrician. What location?',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    const { result } = renderHook(() => useJobChat());

    await act(async () => {
      await result.current.sendMessage('Need an electrician');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/core/chat/parse',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false);
    });

    expect(result.current.messages.length).toBe(3);
    expect(result.current.messages[2].content).toBe('Great, I noted electrician. What location?');
    expect(result.current.jobParams.tradeType).toBe('electrician');
  });

  it('adds fallback assistant message when parse endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'UPSTREAM_ERROR',
            message: 'Service unavailable',
          }),
          {
            status: 503,
            headers: {
              'content-type': 'application/json',
              'x-request-id': 'req-chat-fail-123',
            },
          },
        ),
      ),
    );

    const { result } = renderHook(() => useJobChat());

    await act(async () => {
      await result.current.sendMessage('Need two painters in London');
    });

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false);
    });

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.role).toBe('assistant');
    expect(lastMessage.content).toBe('I could not process that message right now. Please try again in a moment.');
  });
});
