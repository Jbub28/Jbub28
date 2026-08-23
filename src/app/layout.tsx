import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CapacitorInit } from "@/components/native/CapacitorInit";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SafeRoute Nav — GPS Navigation with Crash Risk Insights",
  description:
    "GPS turn-by-turn navigation powered by Mapbox, with historic crash risk overlays from Signal4 Analytics.",
  applicationName: "SafeRoute Nav",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SafeRoute",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
        <CapacitorInit />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
