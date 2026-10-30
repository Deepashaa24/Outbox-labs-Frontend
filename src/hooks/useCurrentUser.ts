import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "../api/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000
  });
}
