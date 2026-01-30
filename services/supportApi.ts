// Placeholder API layer for support tickets.
// Implement real HTTP calls here using `fetch` and `NEXT_PUBLIC_API_BASE_URL`.

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function listTickets() {
  // TODO: call `${BASE}/tickets`
  throw new Error('Not implemented');
}

export async function createTicket(payload: { title: string; details: string; date: string }) {
  // TODO: POST to `${BASE}/tickets`
  throw new Error('Not implemented');
}

export async function getTicket(id: string) {
  // TODO: GET `${BASE}/tickets/${id}`
  throw new Error('Not implemented');
}

export async function closeTicket(id: string) {
  // TODO: PATCH/PUT `${BASE}/tickets/${id}`
  throw new Error('Not implemented');
}
