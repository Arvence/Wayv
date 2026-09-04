import type { Metadata } from "next";

import { DevUserSwitcher } from "@/components/dev-user-switcher";
import { TRPCProvider } from "@/trpc/provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Full-stack Project",
  description: "A reusable full-stack application foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TRPCProvider>
          <div className="min-h-screen">
            <header className="sticky top-0 z-50 border-b bg-background/95 shadow-sm backdrop-blur">
              <div className="mx-auto w-full max-w-[1600px] px-6 py-3">
                <DevUserSwitcher />
              </div>
            </header>
            <div>{children}</div>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
