import type { Metadata, Viewport } from "next";
import { Sora, Plus_Jakarta_Sans, JetBrains_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { localeInfo, messages } from "@oenod/i18n";
import { requestLocale } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n";
import { ToastProvider } from "@/components/ui";
import { APP_URL } from "@/lib/env";
import "./globals.css";

const display = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "OENOD: run your whole business with AI", template: "%s · OENOD" },
  description: "One connected platform for people, customers, money and operations, with an AI Business Manager that does the work and brings you only the decisions that need you.",
  applicationName: "OENOD",
  icons: { icon: "/brand/icon.png", apple: "/brand/icon.png" },
  openGraph: { siteName: "OENOD", type: "website" },
};
export const viewport: Viewport = { themeColor: "#000F55", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await requestLocale();
  return (
    <html lang={locale} dir={localeInfo(locale).dir} className={`${display.variable} ${body.variable} ${mono.variable} ${arabic.variable}`}>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale} dict={messages(locale)}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
