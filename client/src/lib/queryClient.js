import { QueryClient } from "@tanstack/react-query";

/**
 * Single QueryClient for the whole app.
 *
 * Defaults are tuned for a realtime chat app:
 * - staleTime: server lists are treated as fresh for 30s so switching between
 *   sidebar/panels reuses the cache instead of refetching.
 * - refetchOnWindowFocus: disabled because socket events already keep the
 *   cache in sync; refetching on every tab focus would cause flicker/races.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Centralized query keys. Keeping these in one place makes invalidation from
 * socket handlers and mutations predictable.
 */
export const queryKeys = {
  users: ["users"],
  connections: ["connections", "all"],
  receivedRequests: ["connections", "received"],
  connectionSearchRoot: ["connections", "search"],
  connectionSearch: (query) => ["connections", "search", query],
  chat: (userId) => ["chat", userId],
  messages: (chatId) => ["messages", chatId],
};
