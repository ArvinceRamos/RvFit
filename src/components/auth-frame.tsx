import { requestClock } from "@/lib/request-clock";
import { FrameShell } from "./frame-shell";
import { SignedInNav, SignedInTabBar } from "./signed-in-nav";
import { TimeZoneSync } from "./time-zone-sync";

// Pass showNav on pages that need a signed-in user. The menu items live in src/lib/nav.ts.
// Pages without the menu use PlainFrame (src/components/frame-shell.tsx) instead.
export async function AuthFrame({ children, showNav = false }: { children: React.ReactNode; showNav?: boolean }) {
  if (!showNav) return <FrameShell>{children}</FrameShell>;
  const { timeZone } = await requestClock();
  return (
    <FrameShell nav={<SignedInNav />} tabBar={<SignedInTabBar />}>
      <TimeZoneSync serverTimeZone={timeZone} />
      {children}
    </FrameShell>
  );
}
