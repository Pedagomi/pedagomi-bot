import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/provider";
import { Toaster } from "sonner";
import "./globals.css";

// Toutes les pages sont dynamiques (Supabase auth via cookies)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Pedagomi Bot - Reservation auto des places d'examen",
    description: "Application Pedagomi pour reserver automatiquement les places d'examen du permis de conduire sur RdvPermis.",
    manifest: "/manifest.json",
    icons: {
          icon: [
            { url: "/favicon.svg", type: "image/svg+xml" },
                ],
    },
    appleWebApp: {
          capable: true,
          statusBarStyle: "default",
          title: "Pedagomi Bot",
    },
    applicationName: "Pedagomi Bot",
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
      { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
        ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
          <html lang="fr" suppressHydrationWarning>
                <body className="min-h-screen antialiased">
                        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                          {children}
                                  <Toaster richColors position="top-right" closeButton />
                        </ThemeProvider>ThemeProvider>
                </body>body>
          </html>html>
        );
}</html>
