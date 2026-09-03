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
    <html lang="en">
      <body className="antialiased">
        <TRPCProvider>
          <div className="min-h-screen">
            <header className="border-b bg-background/80">
              <div className="mx-auto max-w-5xl px-4 py-3">
                <DevUserSwitcher />
              </div>
            </header>
            {children}
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
