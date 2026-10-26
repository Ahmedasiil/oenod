import * as L from "lucide-react";

/** Render a lucide icon by name (module catalogue stores names as strings). */
export function Icon({ name, className = "h-[17px] w-[17px]", strokeWidth = 1.8 }: { name: string; className?: string; strokeWidth?: number }) {
  const C = ((L as any)[name] ?? L.Circle) as L.LucideIcon;
  return <C className={className} strokeWidth={strokeWidth} aria-hidden />;
}
