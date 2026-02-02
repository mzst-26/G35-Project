"use client";

import { useEffect, useState } from "react";
import { Ticket } from "@/types/support";

const STORAGE_KEY = "supportTickets";

export function useSupport() {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Ticket[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch {
      // ignore
    }
  }, [tickets]);

  function createTicket(data: Omit<Ticket, 'id' | 'createdAt' | 'status'>) {
    const t: Ticket = {
      id: String(Date.now()),
      title: data.title,
      details: data.details,
      date: data.date,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setTickets((prev) => [t, ...prev]);
    return t;
  }

  function closeTicket(id: string) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'closed' } : t)));
  }

  function getTicket(id: string) {
    return tickets.find((t) => t.id === id) ?? null;
  }

  return { tickets, createTicket, closeTicket, getTicket } as const;
}
