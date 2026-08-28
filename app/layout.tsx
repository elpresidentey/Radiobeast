import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalPlayer } from "@/components/GlobalPlayer";
import { PWARegister } from "@/components/PWARegister";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Radiobeast — Listen to World Radio Live",
  description: "Stream 45,000+ radio stations from every country. Search by country, language, genre. Free, no sign-up.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Radiobeast" },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Radiobeast — World Radio",
    description: "Listen to any radio station from any part of the world. 45k+ live stations.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] flex flex-col">
        <ThemeProvider>
          <PWARegister />
          {children}
          <GlobalPlayer />
          <div className="h-[76px] shrink-0" />
        </ThemeProvider>
        {/* theme init without React script tag — avoids Next hydration error */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('radiobeast:theme');var t=s||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
      </body>
    </html>
  );
}
