import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

/**
 * A one-time notice passed in the address, like the web's ?saved=plan. On a phone the tab keeps its
 * params, so the notice is cleared once the user leaves the screen, and does not come back.
 */
export function useNoticeParam(name: string): string | undefined {
  const params = useLocalSearchParams<Record<string, string>>();
  const value = params[name];
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (value) router.setParams({ [name]: undefined });
      };
    }, [name, value]),
  );
  return value;
}
