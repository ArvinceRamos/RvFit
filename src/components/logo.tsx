import Image from "next/image";

// RvFit mark (public/logo-mark.png) plus the wordmark: "Rv" in the accent color, "Fit" in the text color.
export function Logo() {
  return (
    <span aria-label="RvFit" className="inline-flex items-center gap-2">
      <Image alt="" aria-hidden="true" className="h-7 w-7" height={28} src="/logo-mark.png" width={28} />
      <span aria-hidden="true">
        <span className="text-accent-text">Rv</span>Fit
      </span>
    </span>
  );
}
