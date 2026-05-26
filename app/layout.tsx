import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "CuraSync — Smart Health Monitoring",
  description: "Unified chronic disease management platform for patients and care providers.",
  robots: { index: false, follow: false },
};

// Determine if Clerk is properly configured (real key, not placeholder)
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const CLERK_CONFIGURED = CLERK_KEY.startsWith("pk_live_") || CLERK_KEY.startsWith("pk_test_") && CLERK_KEY.length > 20;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (CLERK_CONFIGURED) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider>
        <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
          <body className="bg-bg-light font-sans text-text-primary antialiased">
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }

  // Build-time fallback — no Clerk (used when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set)
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-light font-sans text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
