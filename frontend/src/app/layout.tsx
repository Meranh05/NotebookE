import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ConnectionGuard } from "@/components/common/ConnectionGuard";
import { themeScript } from "@/lib/theme-script";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { GlobalQuotaListener } from "@/components/common/GlobalQuotaListener";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-spline-mono", // keeping the variable name so we don't have to change tailwind/css
});

export const metadata: Metadata = {
  title: {
    default: "NotebookE",
    template: "%s · NotebookE",
  },
  description: "Local AI workspace for research, contextual chat, podcasts, and videos.",
  applicationName: "NotebookE",
  metadataBase: new URL("https://github.com/Meranh05/NotebookE"),
  openGraph: {
    title: "NotebookE",
    description: "Turn documents into knowledge, podcasts, and videos with local AI.",
    type: "website",
    images: [{
      url: "https://raw.githubusercontent.com/Meranh05/NotebookE/main/frontend/public/logobrand.png",
      alt: "NotebookE",
    }],
  },
  icons: [
    {
      media: "(prefers-color-scheme: light)",
      url: "/favicon.ico",
      href: "/favicon.ico",
    },
    {
      media: "(prefers-color-scheme: dark)",
      url: "/favicon-dark.ico",
      href: "/favicon-dark.ico",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <ThemeProvider>
            <QueryProvider>
              <I18nProvider>
                <ConnectionGuard>
                  {children}
                  <GlobalQuotaListener />
                  <Toaster />
                </ConnectionGuard>
              </I18nProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
