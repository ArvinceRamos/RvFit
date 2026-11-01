import { GLOSSARY } from "@/lib/glossary";
import { Screen } from "~/components/screen";
import { Card, Stack, Txt } from "~/components/ui";

// What the words in RvFit mean (web: /glossary), from the same shared list.
export default function Glossary() {
  return (
    <Screen>
      <Txt tone="muted">What the words in RvFit mean.</Txt>
      {GLOSSARY.map(({ group, terms }) => (
        <Card key={group}>
          <Stack gap={14}>
            <Txt variant="section">{group}</Txt>
            {terms.map(({ term, meaning }) => (
              <Stack gap={2} key={term}>
                <Txt weight="semibold">{term}</Txt>
                <Txt style={{ lineHeight: 24 }} tone="muted">{meaning}</Txt>
              </Stack>
            ))}
          </Stack>
        </Card>
      ))}
    </Screen>
  );
}
