import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { queryClient } from "./query";
import { supabase } from "./supabase";

// The signed-in session for the whole app. Screens never take a user ID from anywhere else:
// the session comes from Supabase Auth, and the database checks it again with row-level security.

type AuthState = {
  session: Session | null;
  // True until the saved session has been read from secure storage.
  loading: boolean;
  // Set when Supabase reports a password-recovery sign-in (the reset email link).
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      // A different user (or none) must never see the last user's cached data.
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        if (event === "SIGNED_OUT") setRecovering(false);
        queryClient.clear();
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading, recovering, setRecovering }), [session, loading, recovering]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/** The signed-in user's ID and metadata. Only for screens behind the signed-in guard. */
export function useUser() {
  const { session } = useAuth();
  if (!session) throw new Error("useUser needs a signed-in session");
  return session.user;
}
