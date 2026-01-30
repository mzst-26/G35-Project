export interface Ticket {
  id: string; // backend-friendly id (UUID-ready)
  title: string;
  details: string;
  date: string; // ISO date string (yyyy-mm-dd)
  status: 'open' | 'closed';
  createdAt: string; // ISO timestamp
}

export type TicketStatus = Ticket['status'];
