import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
}>) {
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
              <header className="flex items-center justify-between border-b border-white/5 bg-slate-900/70 px-6 py-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">
                  <span className="rounded-full bg-pink-600/20 px-2 py-1 text-pink-100">
                    Local
                  </span>
                  <span className="hidden sm:inline text-slate-400">Cherry Dev Console</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <Link
                    href="/simulate"
                    className="rounded-md border border-pink-500/40 bg-pink-600/20 px-3 py-1.5 text-pink-100 hover:bg-pink-600/30 transition"
                  >
                    New Simulation
                  </Link>
                  <UserMenu email={userEmail} />
                </div>
              </header>
              <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
