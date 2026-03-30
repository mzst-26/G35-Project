"use client";

import { Ticket } from "@/types/support";

export interface UseSupportOptions {
  pageSize?: 25 | 50 | 100;
  pageNumber?: number;
}

export interface UseSupportReturn {
  tickets: Ticket[];
  total: number;
  currentPage: number;
  pageSize: 25 | 50 | 100;
  hasNextPage: boolean;
  isLoading: boolean;
  error: string | null;
  createTicket: (data: Omit<Ticket, 'id' | 'createdAt' | 'status'>) => null;
  closeTicket: (id: string) => void;
  getTicket: (id: string) => null;
  refresh: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setPageSize: (size: 25 | 50 | 100) => Promise<void>;
}

export function useSupport(options?: UseSupportOptions): UseSupportReturn {
  const pageSize = options?.pageSize ?? 25;
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

  async function refresh() {
    // TODO: implement refresh when Communications service integration is ready.
  }

  async function goToPage(page: number) {
    void page;
    // TODO: implement pagination when Communications service integration is ready.
  }

  async function setPageSize(size: 25 | 50 | 100) {
    void size;
    // TODO: implement page size change when Communications service integration is ready.
  }

  return {
    tickets,
    total: 0,
    currentPage: 1,
    pageSize,
    hasNextPage: false,
    isLoading: false,
    error: null,
    createTicket,
    closeTicket,
    getTicket,
    refresh,
    goToPage,
    setPageSize,
  } as const;
}
