"use client";

import { Ticket } from "@/types/support";

export function useSupport() {
  const tickets: Ticket[] = [];

  function createTicket(data: Omit<Ticket, 'id' | 'createdAt' | 'status'>) {
    void data;
    // TODO: implement POST /tickets against Communications service.
    return null;
  }

  function closeTicket(id: string) {
    void id;
    // TODO: implement PATCH /tickets/:id against Communications service.
  }

  function getTicket(id: string) {
    void id;
    // TODO: implement GET /tickets/:id against Communications service.
    return null;
  }

  return { tickets, createTicket, closeTicket, getTicket } as const;
}
