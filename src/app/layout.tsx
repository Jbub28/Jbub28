import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const sans = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0a3161",
};

export const metadata: Metadata = {
  title: "EnergyGuard JRB",
  description: "Job Risk Briefing for Electric Delivery crews",
  applicationName: "EnergyGuard JRB",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "EnergyGuard JRB", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
