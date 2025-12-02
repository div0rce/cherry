import type { JSX } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import { SidebarNav } from "@/components/sidebar-nav";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DevConsoleHeader } from "@/components/dev-console-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cherry Dev Console",
  description: "Simulate card routing, rewards, and budget buckets.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? "Not signed in";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <AuthProvider>
          <div className="flex min-h-screen">
            <SidebarNav />
            <div className="flex-1 flex flex-col bg-slate-900">
              <DevConsoleHeader userEmail={userEmail} />
              <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
