import type { Metadata } from "next";

import { ScrollToTop } from "@/components/scroll-to-top";
import { Toaster } from "@/components/ui/sonner";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Prep",
  description:
    "Readable interview preparation with clean explanations and code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <ScrollToTop />
          {children}
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
