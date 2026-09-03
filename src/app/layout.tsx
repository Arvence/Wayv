import type { Metadata } from "next";

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
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
