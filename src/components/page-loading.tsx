import { AuthFrame } from "./auth-frame";

// Loading state for signed-in pages while the server renders. Same frame and nav as the page,
// with placeholder cards so the layout does not jump when the content arrives.
export function PageLoading({ title }: { title: string }) {
  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted" role="status">Loading…</p>
      <div aria-hidden className="mt-8 grid gap-[30px] md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div className="card h-40 animate-pulse motion-reduce:animate-none" key={index} />
        ))}
      </div>
    </AuthFrame>
  );
}
