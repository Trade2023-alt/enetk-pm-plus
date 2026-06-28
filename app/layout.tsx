import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ENETK PM+",
    template: "%s | ENETK PM+",
  },
  description:
    "Industrial-grade project management and calendar scheduling platform. ISA-101 compliant.",
  keywords: ["project management", "scheduling", "industrial", "ISA-101"],
  robots: { index: false, follow: false }, // Private internal tool
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
        </head>
        <body className="bg-[hsl(220,15%,11%)] text-[hsl(220,10%,88%)] antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
