import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PostPilot — AI Social Media Management for Small Business",
  description:
    "AI-powered social media management for small business. Plan a month of content in 10 minutes. Schedule posts, analyze performance, and grow your audience.",
  openGraph: {
    title: "PostPilot — AI Social Media Management",
    description:
      "Plan a month of social content in 10 minutes. AI-powered posting for Twitter/X, LinkedIn, Instagram, Facebook, and TikTok.",
    type: "website",
    siteName: "PostPilot",
  },
  twitter: {
    card: "summary_large_image",
    title: "PostPilot — AI Social Media Management",
    description:
      "Plan a month of social content in 10 minutes. AI-powered posting for Twitter/X, LinkedIn, Instagram, Facebook, and TikTok.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={0}>
          {children}
        </TooltipProvider>
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}
