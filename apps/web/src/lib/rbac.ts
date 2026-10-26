import type { Role } from "@prisma/client";
import { MODULE_KEYS } from "./modules";

const SELF_SERVICE = ["overview", "ai", "time", "leave", "chat", "academy", "me"];

const ACCESS: Record<Role, string[]> = {
  OWNER: [...MODULE_KEYS, "billing", "me"],
  ADMIN: [...MODULE_KEYS, "billing", "me"],
  MANAGER: MODULE_KEYS.filter((k) => !["accounting", "payroll", "developers"].includes(k)).concat("me"),
  FINANCE: ["overview", "ai", "accounting", "expenses", "sales", "payroll", "purchasing", "reports", "crm", "pos", "inventory", "monitors", "chat", "academy", "me", "time", "leave"],
  ACCOUNTANT: ["overview", "ai", "accounting", "expenses", "sales", "payroll", "reports", "me"],
  EMPLOYEE: SELF_SERVICE,
};

export type Level = "none" | "view" | "edit";
export type Grants = Record<string, Level>;
export const ALWAYS = new Set(["me", "overview"]);

/** Access level for a module: the role's default, overridden by per-person grants. */
export function accessLevel(role: Role, module: string, grants?: Grants | null): Level {
  const g = grants?.[module];
  if (g && !ALWAYS.has(module)) {
    // Grants can't lift anyone into the owner-only areas.
    if (module === "billing" && !["OWNER", "ADMIN"].includes(role)) return "none";
    return g;
  }
  return ACCESS[role]?.includes(module) ? "edit" : "none";
}

export function canAccess(role: Role, module: string, grants?: Grants | null) {
  return accessLevel(role, module, grants) !== "none";
}

export function allowedModules(role: Role, grants?: Grants | null) {
  const keys = new Set([...(ACCESS[role] ?? []), ...Object.keys(grants ?? {})]);
  return [...keys].filter((k) => canAccess(role, k, grants));
}

export function moduleLevels(role: Role, grants?: Grants | null) {
  return Object.fromEntries(allowedModules(role, grants).map((k) => [k, accessLevel(role, k, grants)]));
}

// Actions that must always be approved by a person (blueprint: authorization boundary).
export const HUMAN_APPROVAL_REQUIRED = new Set([
  "release_payroll",
  "send_payment",
  "change_access",
  "send_campaign",
  "sign_contract",
  "hire_or_dismiss",
]);

export const isManager = (role: Role) => ["OWNER", "ADMIN", "MANAGER"].includes(role);
export const isFinance = (role: Role) => ["OWNER", "ADMIN", "FINANCE", "ACCOUNTANT"].includes(role);
