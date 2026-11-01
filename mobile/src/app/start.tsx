import { router } from "expo-router";
import { LegalFooter } from "~/components/legal-footer";
import { Screen } from "~/components/screen";
import { Button, Card, Checkbox, Stack, Txt } from "~/components/ui";
import { saveDraft, useGuestDraft } from "~/lib/guest-draft-store";

// The target-method screen. "I am 18 or older" is required before either path (docs/PLAN.md).
// This is self-reported, not age verification.
export default function Start() {
  const draft = useGuestDraft();
  const confirmed = Boolean(draft.adult_confirmed_at);

  function setAdultConfirmed(value: boolean) {
    saveDraft((current) => ({
      ...current,
      adult_confirmed_at: value ? current.adult_confirmed_at ?? new Date().toISOString() : undefined,
    }));
  }

  return (
    <Screen>
      <Card>
        <Stack gap={12}>
          <Txt variant="eyebrow">Start setup</Txt>
          <Txt variant="h1">Choose how to set your target</Txt>
          <Txt tone="muted">You can start with an estimate or enter a calorie target you already use.</Txt>
          <Checkbox checked={confirmed} label="I am 18 or older" onChange={setAdultConfirmed} />
          <Button disabled={!confirmed} full onPress={() => router.push("/calculate")}>Calculate my estimate</Button>
          <Button disabled={!confirmed} full onPress={() => router.push("/manual")} variant="secondary">Enter my own target</Button>
          {!confirmed ? <Txt tone="muted" variant="small">Confirm your age to continue.</Txt> : null}
        </Stack>
      </Card>
      <LegalFooter />
    </Screen>
  );
}
