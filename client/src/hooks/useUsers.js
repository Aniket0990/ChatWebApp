import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { queryKeys } from "../lib/queryClient";
import api from "../utils/axios";

/* ------------------------------- users api ------------------------------ */

/** Connected users that appear in the chat sidebar. */
export const getUsers = async () => {
  const { data } = await api.get("/auth/users");
  return data;
};

/* ------------------------------ users hook ------------------------------ */

/**
 * Connected users shown in the sidebar.
 * Socket events update this query cache directly, so no manual refetch wiring
 * is needed to keep the list live.
 */
export function useUsers() {
  const { user } = useContext(AuthContext);

  return useQuery({
    queryKey: queryKeys.users,
    queryFn: getUsers,
    enabled: Boolean(user?.token),
  });
}
