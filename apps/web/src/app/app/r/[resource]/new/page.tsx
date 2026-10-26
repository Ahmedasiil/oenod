"use client";
import { use } from "react";
import { notFound, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resourceByKey } from "@/lib/fields";
import { ResourceForm } from "@/components/resource";

export default function NewResource({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = use(params);
  const spec = resourceByKey(resource);
  const sp = useSearchParams();
  if (!spec || spec.readOnly) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><Link href={`/app/r/${resource}`} className="eyebrow hover:text-ink">← {spec.label}</Link><h1 className="h1 mt-1">New {spec.singular.toLowerCase()}</h1></div>
      <div className="card p-5"><ResourceForm resource={resource} initial={Object.fromEntries(sp.entries())} /></div>
    </div>
  );
}
