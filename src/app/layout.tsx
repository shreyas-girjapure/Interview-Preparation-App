import type { Metadata } from "next";
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
