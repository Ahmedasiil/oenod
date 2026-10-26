import { NextResponse } from "next/server";
import { clickAd } from "@/lib/ads";
import { APP_URL } from "@/lib/env";

export async function GET(req: Request) {
  try {
    return NextResponse.redirect(await clickAd(new URL(req.url).searchParams.get("t") ?? ""));
  } catch {
    return NextResponse.redirect(`${APP_URL}/companies`);
  }
}
