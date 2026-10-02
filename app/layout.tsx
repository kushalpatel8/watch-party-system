import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ToastContainer } from '@/components/ui/ToastNotification';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncTube — YouTube Watch Party",
  description:
    "Watch YouTube videos together in real time with synchronized playback, rooms, and role-based controls.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-[100dvh] w-full flex flex-col bg-[#fcfaf7] dark:bg-[#1e293b] text-stone-900 dark:text-white transition-colors duration-200 overflow-x-hidden">
          <ThemeProvider>
            {children}
            <ToastContainer />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}