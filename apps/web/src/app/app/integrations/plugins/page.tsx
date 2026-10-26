import { redirect } from "next/navigation";

export default function PluginsRedirect() {
  redirect("/app/integrations?tab=plugins");
}
