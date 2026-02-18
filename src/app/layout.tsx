import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SeedBay - Marketplace de Projets SaaS",
  description: "Achetez et vendez des projets SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
