"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { canAccess, homeForRole } from "@/lib/access";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && !canAccess(pathname, user.role)) {
      // Redirect unauthorized user to their home page.
      router.replace(homeForRole(user.role));
    }
  }, [isAuthenticated, user, pathname, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex items-center gap-2 text-brand-gray-mid">
          <div className="w-5 h-5 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
          Memuat...
        </div>
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}
