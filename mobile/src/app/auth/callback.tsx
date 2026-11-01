import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { LoadingView } from "~/components/screen";
import { logError } from "@/lib/log";
import { useAuth } from "~/lib/auth";
import { supabase } from "~/lib/supabase";

// Email links open the app here (rvfit://auth/callback?code=...), like the web's /auth/callback route.
// The one-time code is exchanged for a session with the verifier this install saved when it asked for
// the email, so a link only works on the phone that requested it. Destinations are fixed.
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; next?: string; error?: string; error_code?: string }>();
  const { setRecovering } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const isReset = params.next === "reset-password";
    const failure = isReset ? "/forgot-password?error=expired" : "/login?error=link";

    void (async () => {
      // Google sends ?error= when the user cancels; expired email links carry error_code=otp_expired.
      if (params.error && !isReset && params.error_code !== "otp_expired") {
        router.replace("/login?error=oauth");
        return;
      }
      if (!params.code) {
        router.replace(failure);
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        logError("auth.exchangeCode", error);
        router.replace(failure);
        return;
      }
      if (isReset) {
        setRecovering(true);
        router.replace("/reset-password");
      } else {
        router.replace("/today");
      }
    })();
  }, [params.code, params.error, params.error_code, params.next, setRecovering]);

  return <LoadingView label="Signing you in…" />;
}
