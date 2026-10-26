import { Suspense } from "react";

export const metadata = { title: "Learning" };

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
