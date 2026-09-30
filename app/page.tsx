"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { homeForRole } from "@/lib/access";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user) {
      router.replace(homeForRole(user.role));
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="flex items-center gap-2 text-brand-gray-mid">
        <div className="w-5 h-5 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        Mengarahkan...
      </div>
    </div>
  );
}
