/**
 * Custom hook for managing support tickets data
 */
import { useState } from "react";
import { Ticket, TicketStatus } from "@/types/admin-dashboard";

const sampleTickets: Ticket[] = [
  {
    id: "1",
    userName: "Alex Turner",
    subject: "Unable to access dashboard",
    date: "2026-02-04",
    status: "open",
  },
  {
    id: "2",
    userName: "Rachel Green",
    subject: "Payment not processed",
    date: "2026-02-04",
    status: "open",
  },
  {
    id: "3",
    userName: "David Chen",
    subject: "Profile update issue",
    date: "2026-02-03",
    status: "pending",
  },
  {
    id: "4",
    userName: "Maria Garcia",
    subject: "Job posting error",
    date: "2026-02-02",
    status: "pending",
  },
  {
    id: "5",
    userName: "James Wilson",
    subject: "Account verification",
    date: "2026-01-30",
    status: "closed",
  },
  {
    id: "6",
    userName: "Linda Martinez",
    subject: "Password reset request",
    date: "2026-01-28",
    status: "closed",
  },
];

export const useTickets = () => {
  const [tickets] = useState<Ticket[]>(sampleTickets);

  const getTicketsCount = (status: TicketStatus): number => {
    return tickets.filter((ticket) => ticket.status === status).length;
  };

  const getFilteredTickets = (status: TicketStatus): Ticket[] => {
    return tickets.filter((ticket) => ticket.status === status);
  };

  const getTicketById = (id: string): Ticket | undefined => {
    return tickets.find((ticket) => ticket.id === id);
  };

  return {
    tickets,
    getTicketsCount,
    getFilteredTickets,
    getTicketById,
  };
};
