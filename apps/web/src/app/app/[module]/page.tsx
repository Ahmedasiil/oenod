"use client";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { RESOURCES } from "@/lib/fields";
import { ResourceTable } from "@/components/resource";
import { PageHeader, Tabs, Callout } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";

// Home of any module without a bespoke screen: its records in tabs, with the module's capabilities.
export default function ModuleHome({ params }: { params: Promise<{ module: string }> }) {
  const { module: slug } = use(params);
  const m = MODULES.find((x) => x.href === `/app/${slug}`);
  const s = useSession();
  const t = useT();
  if (!m) notFound();
  const specs = RESOURCES.filter((r) => r.module === m.key);
  const [tab, setTab] = useState(specs[0]?.key ?? "");
  if (!s.modules.includes(m.key)) return <Callout tone="warn" title={t("errors.forbidden")}>Ask an owner or manager to give you access to {t(`modules.${m.key}`)}.</Callout>;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={m.group} title={<span className="inline-flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-navy"><Icon name={m.icon} className="h-5 w-5" /></span>{t(`modules.${m.key}`)}</span>} sub={m.tagline}
        actions={<Link href="/app/ai" className="btn"><Sparkles className="h-4 w-4 text-blue" />Ask AI</Link>} />
      {s.pausedModules.includes(m.key) && <Callout tone="warn">{t("maintenance.moduleMaintenance")}</Callout>}
      {specs.length > 1 && <Tabs tabs={specs.map((r) => ({ key: r.key, label: r.label }))} value={tab} onChange={setTab} />}
      {tab && <ResourceTable key={tab} resource={tab} />}
      <div className="flex flex-wrap gap-2 pt-2">{m.features.map((f) => <span key={f} className="chip bg-paper">{f}</span>)}</div>
    </div>
  );
}
