"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillingSessionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/billing-history");
  }, [router]);
  return null;
}
