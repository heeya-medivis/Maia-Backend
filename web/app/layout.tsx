import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

// Monospace font for code
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// TT Commons Pro from Unity project
const ttCommonsPro = localFont({
  src: [
    {
      path: "../public/fonts/TTCommonsPro-Md.ttf",
      weight: "400", // Using Medium as base
      style: "normal",
    },
    {
      path: "../public/fonts/TTCommonsPro-Md.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/TTCommonsPro-Db.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/TTCommonsPro-Bd.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-tt-commons",
});

export const metadata: Metadata = {
  title: "MAIA - Medical AI Assistant",
  description: "Sign in to MAIA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ttCommonsPro.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
