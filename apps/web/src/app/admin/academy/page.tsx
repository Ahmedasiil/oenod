"use client";
import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { num } from "@/lib/format";
import { Card, ErrorNote, Input, Loading, PageHeader, Stat, Toggle, cx, humanize, useToast } from "@/components/ui";
import { Table, cents } from "../bits";

type C = { id: string; slug: string; title: string; category: string; level: string; priceCents: number; compareAtCents: number | null; featured: boolean; published: boolean; revenueCents: number; sales: number; completions: number; _count: { enrollments: number; lessons: number } };

export default function AcademyAdmin() {
  const toast = useToast();
  const { data, error, reload } = useApi<{ data: C[]; passHolders: number }>("/api/admin/academy");
  const patch = async (id: string, body: Partial<C>) => { try { await api(`/api/admin/academy/${id}`, { method: "PATCH", body }); reload(); } catch (e: any) { toast(e.message, "err"); } };
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const rows = data.data;
  const free = rows.filter((c) => c.priceCents === 0).length;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="OENOD Academy" sub="Original OENOD courses. Set prices, choose what's featured, and publish or hide courses." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Courses" value={num(rows.length)} hint={`${rows.filter((c) => c.published).length} published`} />
        <Stat label="Free courses" value={`${rows.length ? Math.round((free / rows.length) * 100) : 0}%`} hint={`${free} of ${rows.length}`} />
        <Stat label="Learners enrolled" value={num(rows.reduce((a, c) => a + c._count.enrollments, 0))} hint={`${num(rows.reduce((a, c) => a + c.completions, 0))} finished`} />
        <Stat label="Academy Pass holders" value={num(data.passHolders)} hint={`${cents(rows.reduce((a, c) => a + c.revenueCents, 0))} course sales`} />
      </div>
      <Card pad={false}>
        <Table head={["Course", "Price (CAD)", "Enrolled", "Finished", "Sales", "Featured", "Published"]} empty={!rows.length}>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="px-5 py-3"><Link href={`/academy/${c.slug}`} target="_blank" className="font-semibold hover:text-blue">{c.title}</Link><small className="block text-muted">{humanize(c.category)} · {humanize(c.level)} · {c._count.lessons} lessons</small></td>
              <td className="px-5 py-3"><Input type="number" min={0} step="0.01" defaultValue={(c.priceCents / 100).toFixed(2)} onBlur={(e) => { const v = Math.round(Number(e.target.value) * 100); if (v !== c.priceCents) patch(c.id, { priceCents: v }); }} className="h-9 w-24" /></td>
              <td className="px-5 py-3 tabular-nums">{num(c._count.enrollments)}</td>
              <td className="px-5 py-3 tabular-nums">{num(c.completions)}</td>
              <td className="px-5 py-3 tabular-nums">{num(c.sales)}<small className="block text-muted">{cents(c.revenueCents)}</small></td>
              <td className="px-5 py-3"><button onClick={() => patch(c.id, { featured: !c.featured })} aria-label="Featured"><Star className={cx("h-5 w-5", c.featured ? "fill-[#FFB020] text-[#FFB020]" : "text-line")} /></button></td>
              <td className="px-5 py-3"><Toggle checked={c.published} onChange={(v) => patch(c.id, { published: v })} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
