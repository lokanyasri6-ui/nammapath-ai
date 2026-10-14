import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: { default: "NammaPath AI — mobility-aware routes", template: "%s · NammaPath AI" },
  description:
    "Find pedestrian routes that match your mobility needs, using AI-assisted, community-verified barrier reports. Tamil and English.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#13263D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteHeader />
          <DemoBanner />
          <main id="main" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
