import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import { LayoutContent } from "@/components/LayoutContent";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FollowUp AI | Dashboard",
  description: "Sistema de seguimiento inteligente para GHL y WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-slate-200`}>
        <SessionWrapper>
          <LayoutContent>{children}</LayoutContent>
        </SessionWrapper>
      </body>
    </html>
  );
}
