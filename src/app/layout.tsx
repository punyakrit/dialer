import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { PwaBoot } from "@/components/providers/pwa-boot";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dialer.launchcraft.studio",
  ),
  title: {
    default: "Dialer by LaunchCraft",
    template: "%s · Dialer by LaunchCraft",
  },
  description:
    "Browser-based outbound calling platform for agencies. Built on Twilio Voice, with a built-in CRM, power dialer, voicemail drop and SMS follow-up. A LaunchCraft product.",
  applicationName: "Dialer by LaunchCraft",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "https://dialer.launchcraft.studio",
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Dialer by LaunchCraft",
    description:
      "Browser-based outbound calling for agencies. Bring your own Twilio number, no per-seat markup.",
    url: "https://dialer.launchcraft.studio",
    siteName: "Dialer by LaunchCraft",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dialer by LaunchCraft",
    description:
      "Browser-based outbound calling for agencies. Bring your own Twilio number.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <TooltipProvider delayDuration={150}>
              {children}
              <PwaBoot />
              <Toaster position="bottom-right" richColors closeButton />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
