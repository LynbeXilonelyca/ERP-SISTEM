"use client";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "yellow"
  | "gray";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-orange-100 text-orange-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  yellow: "bg-brand-yellow text-brand-black",
  gray: "bg-gray-200 text-gray-600",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("badge", variantStyles[variant], className)}>
      {children}
    </span>
  );
}

// Convenience helpers for common status fields
export function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    DRAFT: "gray",
    CANCELLED: "danger",
    PENDING_SUPER: "warning",
    PENDING_SHIPPING: "info",
    PENDING_FINANCE: "warning",
    CONFIRMED: "info",
    PRINTED: "yellow",
    READY_TO_SHIP: "warning",
    SENDING: "warning",
    DELIVERED: "success",
    RETURNED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status.replace(/_/g, " ")}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    UNPAID: "danger",
    PARTIAL: "warning",
    PAID: "success",
    OVERDUE: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

export function PurchaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    DRAFT: "gray",
    SUBMITTED: "info",
    APPROVED: "success",
    REJECTED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

export function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: "success",
    PENDING_REVIEW: "warning",
    DONE: "info",
    CANCELLED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status.replace(/_/g, " ")}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    SUPER_ADMIN: "yellow",
    SALES: "info",
    SALES_ADMIN: "success",
    SHIPPING_ADMIN: "warning",
    FINANCE: "default",
    PURCHASE_ADMIN: "gray",
  };
  return <Badge variant={map[role] ?? "default"}>{role.replace(/_/g, " ")}</Badge>;
}
