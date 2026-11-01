import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { maxDisplayNameLength } from "@/lib/display-name";
import { GUEST_DRAFT_STORAGE_KEY } from "@/lib/guest-draft";
import { WORKOUT_DRAFTS_STORAGE_KEY } from "@/lib/workout-draft";
import { Alert, Button, Card, Field, Row, Segmented, Stack, TextLink, Txt } from "~/components/ui";
import { useAction } from "~/lib/actions";
import { refreshAll } from "~/lib/query";
import { supabase } from "~/lib/supabase";
import { deleteAccount, saveDisplayName } from "~/services/account";
import { useTheme, type ThemeChoice } from "~/theme/theme";

// Account details: the email (read only) and an optional name used in the Today greeting.
export function AccountCard({ email, name }: { email: string; name: string }) {
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const save = useAction(saveDisplayName, "Your name could not be saved. Please try again.");

  async function submit() {
    setMessage(undefined);
    const result = await save.run(value);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    // The greeting reads the name from the session, so fetch a session that carries it.
    await supabase.auth.refreshSession().catch(() => {});
    setMessage({ ok: true, text: "Name saved." });
  }

  return (
    <Card>
      <Stack gap={12}>
        <Txt variant="section">Account</Txt>
        <Txt tone="muted" variant="small">Signed in as {email}</Txt>
        <Field autoCapitalize="words" autoComplete="given-name" hint="Used for the greeting on Today." label="Name (optional)" maxLength={maxDisplayNameLength} onChangeText={setValue} onSubmitEditing={submit} returnKeyType="done" textContentType="givenName" value={value} />
        {message ? <Alert tone={message.ok ? "success" : "danger"}>{message.text}</Alert> : null}
        <Button loading={save.pending} loadingText="Saving…" onPress={submit} variant="secondary">Save name</Button>
      </Stack>
    </Card>
  );
}

// Follow the phone's setting, or always light or dark (the web header toggle).
export function AppearanceCard() {
  const { choice, setChoice } = useTheme();
  return (
    <Card>
      <Stack gap={10}>
        <Txt variant="section">Appearance</Txt>
        <Segmented<ThemeChoice> label="Theme" onChange={setChoice} options={[{ value: "system", label: "Phone" }, { value: "light", label: "Day" }, { value: "dark", label: "Night" }]} value={choice} />
      </Stack>
    </Card>
  );
}

/** Logs out, then clears any unsaved guest setup or workout drafts so they do not stay on a shared phone. */
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logOut() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const { error } = await supabase.auth.signOut().catch((caught: unknown) => ({ error: caught }));
    if (error) {
      // The session is still active, so say so instead of pretending the user is logged out.
      setPending(false);
      setFailed(true);
      return;
    }
    try {
      globalThis.localStorage?.removeItem(GUEST_DRAFT_STORAGE_KEY);
      globalThis.localStorage?.removeItem(WORKOUT_DRAFTS_STORAGE_KEY);
    } catch {}
    router.replace("/welcome");
  }

  return (
    <Stack gap={6}>
      <Button full icon="log-out" loading={pending} loadingText="Logging out…" onPress={logOut} variant="secondary">Log out</Button>
      {failed ? <Alert tone="danger">Could not log out. Check your connection and try again.</Alert> : null}
    </Stack>
  );
}

// The confirmation step is a second button, not a checkbox (docs/PLAN.md, Phase 4).
export function DeleteAccountSection() {
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(undefined);
    const result = await deleteAccount().catch(() => ({ ok: false as const, error: "Your account could not be deleted. Nothing was removed. Please try again." }));
    if (!result.ok) {
      setDeleting(false);
      setError(result.error);
      return;
    }
    try {
      globalThis.localStorage?.removeItem(GUEST_DRAFT_STORAGE_KEY);
      globalThis.localStorage?.removeItem(WORKOUT_DRAFTS_STORAGE_KEY);
    } catch {}
    await refreshAll();
    router.replace("/welcome?account=deleted");
  }

  return (
    <Card danger>
      <Stack gap={10}>
        <Txt variant="section">Delete my account and data</Txt>
        {!confirming ? (
          <>
            <Txt tone="muted" variant="small">Remove your account and everything you have saved in RvFit.</Txt>
            <Button onPress={() => setConfirming(true)} variant="dangerOutline">Delete my account and data</Button>
          </>
        ) : (
          <View accessibilityRole="alert" style={{ borderRadius: 12, backgroundColor: colors.dangerBg, padding: 14, gap: 10 }}>
            <Txt tone="danger" weight="bold">Delete everything?</Txt>
            <Txt variant="small">This deletes your account and all your saved data: profile, calorie targets, weigh-ins, preferences, meals, workouts, steps, sleep, and other activity. It cannot be undone.</Txt>
            {error ? <Txt tone="danger" variant="small" weight="semibold">{error}</Txt> : null}
            <Row gap={10} wrap>
              <Button loading={deleting} loadingText="Deleting…" onPress={confirmDelete} variant="danger">Delete everything</Button>
              <Button disabled={deleting} onPress={() => { setConfirming(false); setError(undefined); }} variant="secondary">Cancel</Button>
            </Row>
          </View>
        )}
      </Stack>
    </Card>
  );
}

export function HelpLinks() {
  return (
    <Card compact>
      <Row gap={18} style={{ justifyContent: "center" }} wrap>
        <TextLink onPress={() => router.push("/privacy")}>Privacy</TextLink>
        <TextLink onPress={() => router.push("/terms")}>Terms</TextLink>
        <TextLink onPress={() => router.push("/glossary")}>Glossary</TextLink>
      </Row>
    </Card>
  );
}
