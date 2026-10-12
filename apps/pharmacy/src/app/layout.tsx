import type { Metadata } from "next";
import { outfitSans, geistMono } from "@curo/web/fonts";
import "./globals.css";
import { AuthProvider } from "@curo/web/auth";
import { QueryProvider } from "@curo/web/query";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CuroMD - Pharmacy Portal",
  description: "Electronic Medical Record system - Pharmacy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfitSans.variable} ${geistMono.variable}`}>
      <body className="antialiased h-screen overflow-hidden flex bg-surface" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
