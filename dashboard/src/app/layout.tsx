import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ?? "http://localhost:3100",
  ),
  title: {
    default: "Radicle VMHQ",
    template: "%s · Radicle VMHQ",
  },
  description:
    "Open-source, self-hosted Next.js dashboard for radicle-httpd. Curated profile, full-node browser, search, and copy-paste clone commands — all read live from your local node.",
  keywords: [
    "radicle",
    "radicle-httpd",
    "decentralized git",
    "p2p code hosting",
    "self-hosted",
    "developer profile",
    "sovereign code",
  ],
  openGraph: {
    title: "Radicle VMHQ",
    description:
      "Open-source Next.js dashboard for your Radicle node. Run it next to your seed and get a polished public profile.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radicle VMHQ",
    description:
      "Open-source Next.js dashboard for your Radicle node. Run it next to your seed and get a polished public profile.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${mono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
