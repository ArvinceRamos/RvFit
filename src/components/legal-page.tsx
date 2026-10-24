import { AuthFrame } from "@/components/auth-frame";
import { LEGAL_UPDATED } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AuthFrame>
      <h1 className="page-title">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 space-y-6 leading-7 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </AuthFrame>
  );
}
