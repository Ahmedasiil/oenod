"use client";
import { Link2 } from "lucide-react";
import { Button, copyText, useToast } from "@/components/ui";

export function CopyLink({ label = "Copy link" }: { label?: string }) {
  const toast = useToast();
  return <Button onClick={async () => { if (await copyText(location.href)) toast("Link copied"); }}><Link2 className="h-4 w-4" />{label}</Button>;
}
