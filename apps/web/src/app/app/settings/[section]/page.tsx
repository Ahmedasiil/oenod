import { redirect } from "next/navigation";

// Friendly deep links (/app/settings/billing, /app/settings/verification…) open the right tab.
const TABS: Record<string, string> = { company: "company", profile: "profile", verification: "profile", team: "team", people: "team", locations: "locations", taxes: "locations", modules: "modules", security: "security", billing: "billing" };

export default async function SettingsSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  redirect(`/app/settings?tab=${TABS[section] ?? "company"}`);
}
