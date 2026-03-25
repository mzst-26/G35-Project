// Request context store using AsyncLocalStorage.
//
// Allows requestId and userId to propagate through async call chains
// without explicit parameter threading. Middleware sets the context;
// any downstream code can read it without needing req access.

import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
  userId?: string;
}

const store = new AsyncLocalStorage<RequestContext>();

// Run fn inside a context with the given requestId (and optional userId).
// Call this in requestId middleware to make the context available downstream.
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return store.run(context, fn);
}

// Returns the requestId from the current async context, or undefined if not set.
export function getRequestId(): string | undefined {
  return store.getStore()?.requestId;
}

// Returns the userId from the current async context, or undefined if not set.
export function getContextUserId(): string | undefined {
  return store.getStore()?.userId;
}
