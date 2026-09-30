"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  FileText,
  ShoppingCart,
  CreditCard,
  BadgeDollarSign,
  UserCog,
  Settings,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ScrollText,
  Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Role } from "@/types";
import { useAuth } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { useData } from "@/lib/store";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
  badge?: string | number;
  roles?: Role[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: <ClipboardCheck className="w-4 h-4" />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Sales Panel",
    href: "/sales/panel",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["SALES", "SALES_ADMIN", "SUPER_ADMIN", "SHIPPING_ADMIN", "FINANCE"],
  },
  {
    label: "Product",
    icon: <Package className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
    children: [
      { label: "Product List", href: "/products" },
      { label: "Categories", href: "/products/categories" },
      { label: "Brands", href: "/products/brands" },
      { label: "Pricing", href: "/products/pricing" },
      { label: "Price History", href: "/products/price-history" },
    ],
  },
  {
    label: "Inventory",
    icon: <Boxes className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
    children: [
      { label: "Current Stock", href: "/inventory" },
      { label: "Reserved Stock", href: "/inventory/reserved" },
      { label: "Stock Movement", href: "/inventory/movements" },
      { label: "Low Stock", href: "/inventory/low-stock" },
    ],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: <Users className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "SALES_ADMIN"],
  },
  {
    label: "Sales",
    icon: <FileText className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "SALES_ADMIN", "FINANCE"],
    children: [
      { label: "Invoices", href: "/sales/invoices" },
      { label: "Sales Sessions", href: "/sales/sessions" },
      { label: "Sales Report", href: "/sales/reports" },
    ],
  },
  {
    label: "Purchasing",
    icon: <ShoppingCart className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "PURCHASE_ADMIN"],
    children: [
      { label: "Purchase Requests", href: "/purchasing" },
      { label: "Approvals", href: "/purchasing/approvals" },
      { label: "Suppliers", href: "/suppliers" },
    ],
  },
  {
    label: "Search",
    href: "/search",
    icon: <Search className="w-4 h-4" />,
  },
  {
    label: "Finance",
    icon: <CreditCard className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "FINANCE"],
    children: [
      { label: "Buat & Print Tagihan", href: "/finance/billing" },
      { label: "Sesi Tagihan", href: "/finance/billing-sessions" },
      { label: "History Penagihan", href: "/finance/billing-history" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Outstanding", href: "/finance/outstanding" },
    ],
  },
  {
    label: "Commission",
    icon: <BadgeDollarSign className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "FINANCE"],
    children: [
      { label: "Transactions", href: "/commission" },
      { label: "Settlement", href: "/commission/settlement" },
      { label: "Adjustments", href: "/commission/adjustments" },
    ],
  },
  {
    label: "Reports",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["SUPER_ADMIN", "SALES_ADMIN", "FINANCE", "PURCHASE_ADMIN"],
    children: [
      { label: "Sales Report", href: "/reports/sales" },
      { label: "Stock Report", href: "/reports/stock" },
      { label: "Finance Report", href: "/reports/finance" },
      { label: "Commission Report", href: "/reports/commission" },
    ],
  },
  {
    label: "User Management",
    href: "/users",
    icon: <UserCog className="w-4 h-4" />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Audit Log",
    href: "/audit",
    icon: <ScrollText className="w-4 h-4" />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="w-4 h-4" />,
    roles: ["SUPER_ADMIN"],
  },
];

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive ?? false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "sidebar-link w-full justify-between",
          isChildActive ? "sidebar-link-active" : "sidebar-link-inactive"
        )}
      >
        <span className="flex items-center gap-3">
          {item.icon}
          <span>{item.label}</span>
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
      {open && (
        <div className="mt-0.5 ml-4 pl-4 border-l-2 border-brand-gray-border flex flex-col gap-0.5">
          {item.children?.map((child) => {
            const active = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "text-sm px-3 py-2 rounded-xl transition-all duration-150",
                  active
                    ? "text-brand-black font-semibold bg-brand-yellow/30"
                    : "text-brand-gray-mid hover:text-brand-black hover:bg-brand-yellow-light"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? "SUPER_ADMIN";

  const { invoices, purchases, sessions, price_change_requests, billing_sessions } = useData();
  const pendingApprovals = useMemo(
    () =>
      invoices.filter((i) => i.invoice_status === "PENDING_SUPER").length +
      purchases.filter((p) => p.status === "SUBMITTED").length +
      price_change_requests.filter((r) => r.status === "PENDING").length +
      sessions.filter((s) => s.status === "PENDING_REVIEW").length +
      billing_sessions.filter((b) => b.status === "PENDING" || b.status === "REVIEWED").length,
    [invoices, purchases, sessions, price_change_requests, billing_sessions]
  );

  const approvalsItem = navItems.find((i) => i.href === "/approvals");
  if (approvalsItem) {
    approvalsItem.badge = pendingApprovals > 0 ? pendingApprovals : undefined;
  }

  const visible = navItems.filter((item) => {
    if (role === "SUPER_ADMIN") return true;
    if (item.roles && !item.roles.includes(role)) return false;
    // filter child links by access
    if (item.children) {
      item.children = item.children.filter((c) => canAccess(c.href, role));
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white shadow-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-gray-border">
        <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-brand-black leading-tight">ERP Admin</p>
            <p className="text-[10px] text-brand-gray-light">Distribution System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {visible.map((item) =>
          item.href ? (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "sidebar-link-active"
                  : "sidebar-link-inactive"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {item.badge && !collapsed && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ) : (
            !collapsed && <NavGroup key={item.label} item={item} />
          )
        )}
      </nav>

      {/* Bottom section */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-brand-gray-border">
          <p className="text-[10px] text-brand-gray-light text-center">
            ERP v1.0 © 2026
          </p>
        </div>
      )}
    </aside>
  );
}
