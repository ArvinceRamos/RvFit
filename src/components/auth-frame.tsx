import { FrameShell } from "./frame-shell";
import { SignedInNav } from "./signed-in-nav";

// Pass showNav on pages that need a signed-in user. The menu items live in src/lib/nav.ts.
// Pages without the menu use PlainFrame (src/components/frame-shell.tsx) instead.
export function AuthFrame({ children, showNav = false }: { children: React.ReactNode; showNav?: boolean }) {
  return <FrameShell nav={showNav ? <SignedInNav /> : undefined}>{children}</FrameShell>;
}
