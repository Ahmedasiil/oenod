"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { resourceByKey } from "@/lib/fields";
import { moduleByKey } from "@/lib/modules";
import { ResourceTable } from "@/components/resource";
import { PageHeader } from "@/components/ui";

export default function ResourceList({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = use(params);
  const spec = resourceByKey(resource);
  if (!spec) notFound();
  const m = moduleByKey(spec.module);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={m?.name} title={spec.label} sub={m?.tagline} />
      <ResourceTable resource={resource} />
    </div>
  );
}
