import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SessionWrapper from "@/components/SessionWrapper";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FollowUp AI | Dashboard",
  description: "Sistema de seguimiento inteligente para GHL y WhatsApp",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const fullPath = headersList.get("x-invoke-path") || "";
  const isLoginPage = fullPath === "/login";

  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-slate-200`}>
        <SessionWrapper>
          {!isLoginPage ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 relative overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                <div className="p-8 max-w-7xl mx-auto w-full">
                  {children}
                </div>
              </main>
            </div>
          ) : (
            <>{children}</>
          )}
        </SessionWrapper>
      </body>
    </html>
  );
}
