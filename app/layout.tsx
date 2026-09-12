import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena Sumpah Pemuda — Cerdas Cermat Online",
  description: "Arena bel cerdas cermat Sumpah Pemuda untuk panitia dan peserta di berbagai perangkat.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
