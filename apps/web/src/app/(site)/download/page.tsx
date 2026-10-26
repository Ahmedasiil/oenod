import { Apple, Smartphone, Monitor, Globe, QrCode } from "lucide-react";
import { SectionHead } from "@/components/site";

export const metadata = { title: "Download the apps" };

// Store links are set by the host once the apps are published (see INSTALL.md).
const LINKS = {
  ios: process.env.NEXT_PUBLIC_IOS_URL, android: process.env.NEXT_PUBLIC_ANDROID_URL,
  mac: process.env.NEXT_PUBLIC_DESKTOP_MAC_URL, win: process.env.NEXT_PUBLIC_DESKTOP_WIN_URL, linux: process.env.NEXT_PUBLIC_DESKTOP_LINUX_URL,
};

function Get({ href, label }: { href?: string; label: string }) {
  return href ? <a href={href} className="btn-pri mt-5 w-full" rel="noopener">{label}</a> : <span className="btn mt-5 w-full cursor-default opacity-70">Coming soon</span>;
}

export default function Download() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHead center eyebrow="Every device" title="OENOD, wherever" accent="you work." sub="One account across the web, iPhone, Android and desktop. Employees only see the parts their manager allows." />
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="card flex flex-col p-6"><Apple className="h-7 w-7 text-navy" /><b className="mt-4 font-display text-xl">iPhone & iPad</b><p className="mt-1 flex-1 text-[13.5px] text-muted">Approvals with Face ID, time clock, schedules, chat and live location for field teams.</p><Get href={LINKS.ios} label="App Store" /></div>
        <div className="card flex flex-col p-6"><Smartphone className="h-7 w-7 text-navy" /><b className="mt-4 font-display text-xl">Android</b><p className="mt-1 flex-1 text-[13.5px] text-muted">Everything on iPhone, plus vehicle tracking from the phone for drivers.</p><Get href={LINKS.android} label="Google Play" /></div>
        <div className="card flex flex-col p-6"><Monitor className="h-7 w-7 text-navy" /><b className="mt-4 font-display text-xl">Desktop</b><p className="mt-1 flex-1 text-[13.5px] text-muted">Native app for Mac, Windows and Linux with notifications and a POS-friendly full-screen mode.</p><div className="mt-5 grid grid-cols-3 gap-2 text-xs">{([["mac", "Mac"], ["win", "Windows"], ["linux", "Linux"]] as const).map(([k, l]) => LINKS[k] ? <a key={k} href={LINKS[k]} className="btn btn-sm">{l}</a> : <span key={k} className="btn btn-sm cursor-default opacity-60">{l}</span>)}</div></div>
        <div className="card flex flex-col p-6"><Globe className="h-7 w-7 text-navy" /><b className="mt-4 font-display text-xl">Web</b><p className="mt-1 flex-1 text-[13.5px] text-muted">Nothing to install. Works in any modern browser and can be added to your home screen.</p><a href="/signin" className="btn-pri mt-5 w-full">Open OENOD</a></div>
      </div>
      <div className="mt-10 flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-line p-8 text-center"><QrCode className="h-6 w-6 text-muted" /><p className="max-w-lg text-[14px] text-muted">Employees: your manager will send you an invitation. Open it on your phone, install the app, and sign in with the same email.</p></div>
    </div>
  );
}
