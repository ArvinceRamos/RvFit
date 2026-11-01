import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Alert as NativeAlert, Platform } from "react-native";
import { refreshAll } from "./query";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Runs one save (a service call) with the state a button needs: pending, the error message, and a
 * reload of every screen's data when it worked, like the web's refresh() after a server action.
 * A thrown error (usually no connection) becomes the given fallback message, so nothing fails silently.
 * onSuccess runs before the reload, for state that must be set before the screen re-renders with new data.
 */
export function useAction<T extends Result, A extends unknown[]>(action: (...args: A) => Promise<T>, fallback: string, onSuccess?: (result: T) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const run = useCallback(
    async (...args: A): Promise<T | { ok: false; error: string }> => {
      setPending(true);
      setError(undefined);
      let result: T | { ok: false; error: string };
      try {
        result = await action(...args);
      } catch {
        result = { ok: false, error: fallback };
      }
      setPending(false);
      if (result.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onSuccess?.(result as T);
        await refreshAll();
      } else {
        setError(result.error);
      }
      return result;
    },
    [action, fallback, onSuccess],
  );

  return { run, pending, error, setError };
}

/**
 * A Yes/No question before something that cannot be undone (the web shows Yes and No buttons inline).
 * Uses the phone's own dialog; the web preview falls back to the browser's confirm().
 */
export function confirmAction({ title, message, confirmLabel, destructive = true }: { title: string; message?: string; confirmLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(`${title}${message ? `\n\n${message}` : ""}`) ?? false);
  return new Promise((resolve) => {
    NativeAlert.alert(title, message, [
      { text: "No", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
