/**
 * Custom hook for managing support tickets data
 */
import { useCallback, useMemo, useState } from "react";
import { Ticket, TicketStatus } from "@/types/admin-dashboard";

// TODO(communications-service): Replace this empty state with real support ticket
// data once Communications Service exposes admin ticket APIs.

export const useTickets = () => {
  const [tickets] = useState<Ticket[]>([]);

  const getTicketsCount = useCallback(
    (status: TicketStatus): number => tickets.filter((ticket) => ticket.status === status).length,
    [tickets],
  );

  const getFilteredTickets = useCallback(
    (status: TicketStatus): Ticket[] => tickets.filter((ticket) => ticket.status === status),
    [tickets],
  );

  const getTicketById = useCallback(
    (id: string): Ticket | undefined => tickets.find((ticket) => ticket.id === id),
    [tickets],
  );

  const hasData = useMemo(() => tickets.length > 0, [tickets.length]);

  return {
    isLoading: false,
    error: null as string | null,
    hasData,
    tickets,
    getTicketsCount,
    getFilteredTickets,
    getTicketById,
  };
};
