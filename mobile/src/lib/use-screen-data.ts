import { useNetInfo } from "@react-native-community/netinfo";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useCallback, useState } from "react";

type Outcome = { ok: true } | { ok: false; error: string };

/**
 * Loads one screen's data with a shared loader from ../src/lib (the same function the web page calls
 * on the server). Returns the data, a refresh for pull-to-refresh, and what to show while loading or
 * after a failure. Loaders return { ok: false } instead of throwing, so that becomes a query error here.
 */
export function useScreenData<R extends Outcome>(key: QueryKey, load: () => Promise<R>) {
  const net = useNetInfo();
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await load();
      if (!result.ok) throw new Error((result as { error: string }).error);
      return result as Extract<R, { ok: true }>;
    },
  });
  const [pulling, setPulling] = useState(false);
  const refresh = useCallback(async () => {
    setPulling(true);
    await query.refetch();
    setPulling(false);
  }, [query]);

  return {
    data: query.data,
    // Only the first load shows a spinner; later reloads keep the last data on screen.
    loading: query.isPending,
    error: query.isError && !query.data ? (query.error as Error).message : null,
    offline: net.isConnected === false,
    refreshing: pulling,
    refresh,
    retry: () => void query.refetch(),
  };
}
