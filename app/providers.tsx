"use client";

import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
    </AuthProvider>
  );
}
