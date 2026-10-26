import Link from "next/link";

/** The OENOD wordmark. Always the lead mark on every surface. */
export function Logo({ tone = "navy", className = "h-6 w-auto", href = "/" }: { tone?: "navy" | "white"; className?: string; href?: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={`/brand/oenod-mark-${tone}.png`} alt="OENOD" className={className} width={594} height={174} />;
  return href ? <Link href={href} aria-label="OENOD home" className="inline-flex shrink-0 items-center">{img}</Link> : img;
}

/** Company logo or a monogram, shown beside OENOD where a company provides something. */
export function CompanyMark({ name, logoUrl, size = 32, color = "#000F55" }: { name: string; logoUrl?: string | null; size?: number; color?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  // eslint-disable-next-line @next/next/no-img-element
  if (logoUrl) return <img src={logoUrl} alt={name} width={size} height={size} className="shrink-0 rounded-[10px] border border-line bg-white object-contain" style={{ width: size, height: size }} />;
  return <span className="grid shrink-0 place-items-center rounded-[10px] font-bold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>{initials || "•"}</span>;
}

export function VerifiedTick({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Verified">
      <path fill="#2342E0" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.7 1.8-1 3.1 1 3.1-2.7 1.8-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.7-1.8 1-3.1-1-3.1 2.7-1.8 1-3.1 3.2.2z" />
      <path d="M7.6 12.3l3 3 5.8-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
