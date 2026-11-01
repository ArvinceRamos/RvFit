import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

// Server data cache. Screens read through it, so a lost connection shows the last data with a
// Retry instead of a blank page, and coming back to the app reloads what may have changed elsewhere
// (for example on the website).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

// React Query's online and focus signals come from the browser on web; on phones they come from
// NetInfo and AppState.
if (Platform.OS !== "web") {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false);
    }),
  );
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}

/** Query keys. Every key starts with the area, so a save can refresh one area at a time. */
export const keys = {
  dashboard: ["dashboard"] as const,
  week: ["week"] as const,
  meals: ["meals"] as const,
  foods: ["foods"] as const,
  workouts: ["workouts"] as const,
  progress: ["progress"] as const,
  profile: ["profile"] as const,
  preferences: ["preferences"] as const,
};

/**
 * After a save, everything that shows user data may be out of date (the web app re-renders the
 * page for the same reason). Marking all of it stale makes each screen reload when it is next shown.
 */
export function refreshAll(): Promise<void> {
  return queryClient.invalidateQueries();
}
