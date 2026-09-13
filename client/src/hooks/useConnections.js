import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { queryKeys } from "../lib/queryClient";
import api from "../utils/axios";

/* ---------------------------- connections api --------------------------- */

/** All accepted connections for the current user. */
export const getConnections = async () => {
  const { data } = await api.get("/connection/all");
  return data;
};

/** Incoming (pending) connection requests. */
export const getReceivedRequests = async () => {
  const { data } = await api.get("/connection/received");
  return data;
};

/** Search users by name/email. */
export const searchUsers = async (query) => {
  const { data } = await api.get(
    `/connection/search?q=${encodeURIComponent(query)}`,
  );
  return data;
};

export const sendConnectionRequest = async (receiverId) => {
  const { data } = await api.post(`/connection/send/${receiverId}`, {});
  return data;
};

export const acceptConnection = async (connectionId) => {
  const { data } = await api.put(`/connection/accept/${connectionId}`, {});
  return data;
};

export const declineConnection = async (connectionId) => {
  const { data } = await api.put(`/connection/decline/${connectionId}`, {});
  return data;
};

export const removeConnection = async (connectionId) => {
  const { data } = await api.delete(`/connection/remove/${connectionId}`);
  return data;
};

/* --------------------------- connections hooks -------------------------- */

/** Accepted connections ("All Connections" tab). */
export function useConnections(enabled = true) {
  const { user } = useContext(AuthContext);

  return useQuery({
    queryKey: queryKeys.connections,
    queryFn: getConnections,
    enabled: enabled && Boolean(user?.token),
  });
}

/**
 * Incoming pending requests. Shared between the sidebar badge, the tabs badge
 * and the received list, so one request serves all three.
 */
export function useReceivedRequests(enabled = true) {
  const { user } = useContext(AuthContext);

  return useQuery({
    queryKey: queryKeys.receivedRequests,
    queryFn: getReceivedRequests,
    enabled: enabled && Boolean(user?.token),
  });
}

/** User search for the "Send Request" tab, keyed by the debounced query. */
export function useSearchUsers(query, { enabled = true } = {}) {
  const { user } = useContext(AuthContext);
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.connectionSearch(trimmed),
    queryFn: () => searchUsers(trimmed),
    enabled: enabled && Boolean(user?.token) && trimmed.length > 0,
  });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendConnectionRequest,
    onSuccess: () => {
      toast.success("Connection request sent!");
      // Refresh search results so the button flips to "Pending".
      queryClient.invalidateQueries({
        queryKey: queryKeys.connectionSearchRoot,
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to send request");
    },
  });
}

export function useAcceptConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId }) => acceptConnection(connectionId),
    onSuccess: (_data, variables) => {
      toast.success(`Connected with ${variables.senderName}!`);
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
    onError: () => {
      toast.error("Failed to accept request");
    },
  });
}

export function useDeclineConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: declineConnection,
    onSuccess: () => {
      toast.info("Request declined");
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
    },
    onError: () => {
      toast.error("Failed to decline request");
    },
  });
}

export function useRemoveConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId }) => removeConnection(connectionId),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.userName
          ? `Removed ${variables.userName} from connections`
          : "Connection removed",
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({
        queryKey: queryKeys.connectionSearchRoot,
      });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to remove connection",
      );
    },
  });
}

