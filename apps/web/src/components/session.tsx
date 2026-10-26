"use client";
import { createContext, useContext } from "react";
import type { Session } from "@/lib/session";

const Ctx = createContext<Session | null>(null);
export const SessionProvider = ({ value, children }: { value: Session; children: React.ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside the app");
  return s;
}
/** "edit" | "view" | "none" for a module, as the server computed it. */
export function useAccess(module: string) {
  const s = useSession();
  return ((s.access as Record<string, string>)[module] ?? "none") as "edit" | "view" | "none";
}
export const isManagerRole = (role?: string | null) => ["OWNER", "ADMIN", "MANAGER"].includes(role ?? "");
