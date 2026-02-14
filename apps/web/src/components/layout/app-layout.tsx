"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SubscriptionRenewalBanner } from "@/components/subscription/renewal-banner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col md:ml-64">
        <Header />
        <div className="px-6 pt-6 md:px-8 md:pt-8">
          <SubscriptionRenewalBanner />
        </div>
        <main className="flex-1 p-6 md:p-8 pt-0 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
