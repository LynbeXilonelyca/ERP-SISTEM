import type { Role } from "@/types";

// Route access control. Each admin route maps to allowed roles (empty/absent = all admins).
export const routeAccess: Record<string, Role[]> = {
  "/dashboard": ["SUPER_ADMIN"],
  "/products": ["SUPER_ADMIN", "SALES_ADMIN"],
  "/products/categories": ["SUPER_ADMIN", "SALES_ADMIN"],
  "/products/brands": ["SUPER_ADMIN", "SALES_ADMIN"],
  "/products/pricing": ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
  "/products/price-history": ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
  "/inventory": ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
  "/inventory/reserved": ["SUPER_ADMIN", "SALES_ADMIN"],
  "/inventory/movements": ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
  "/inventory/low-stock": ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
  "/customers": ["SUPER_ADMIN", "SALES_ADMIN", "SHIPPING_ADMIN"],
  "/sales/invoices": ["SUPER_ADMIN", "SALES_ADMIN"],
  "/sales/panel": ["SALES", "SALES_ADMIN", "SUPER_ADMIN", "SHIPPING_ADMIN", "FINANCE"],
  "/sales/sessions": ["SUPER_ADMIN", "SALES_ADMIN", "FINANCE"],
  "/sales/reports": ["SUPER_ADMIN", "SALES_ADMIN", "FINANCE"],
  "/purchasing": ["SUPER_ADMIN", "PURCHASE_ADMIN"],
  "/purchasing/approvals": ["SUPER_ADMIN"],
  "/suppliers": ["SUPER_ADMIN", "PURCHASE_ADMIN"],
  "/search": [],
  "/finance/billing": ["SUPER_ADMIN", "FINANCE"],
  "/finance/billing-sessions": ["SUPER_ADMIN", "FINANCE"],
  "/finance/billing-history": ["SUPER_ADMIN", "FINANCE"],
  "/finance/payments": ["SUPER_ADMIN", "FINANCE"],
  "/finance/outstanding": ["SUPER_ADMIN", "FINANCE"],
  "/finance/sessions": ["SUPER_ADMIN", "FINANCE"],
  "/commission": ["SUPER_ADMIN", "FINANCE"],
  "/commission/settlement": ["SUPER_ADMIN", "FINANCE"],
  "/commission/adjustments": ["SUPER_ADMIN", "FINANCE"],
  "/reports/sales": ["SUPER_ADMIN", "SALES_ADMIN", "FINANCE"],
  "/reports/stock": ["SUPER_ADMIN", "SALES_ADMIN", "PURCHASE_ADMIN"],
  "/reports/finance": ["SUPER_ADMIN", "FINANCE"],
  "/reports/commission": ["SUPER_ADMIN", "FINANCE"],
  "/users": ["SUPER_ADMIN"],
  "/audit": ["SUPER_ADMIN"],
  "/approvals": ["SUPER_ADMIN"],
  "/settings": ["SUPER_ADMIN"],
};

export function canAccess(path: string, role: Role): boolean {
  // Allow nested subroutes by prefix match on the longest key.
  const exact = routeAccess[path];
  if (exact) return exact.length === 0 || exact.includes(role);
  // fallback: match by prefix of existing keys
  const keys = Object.keys(routeAccess).filter((k) => path.startsWith(k + "/"));
  if (keys.length === 0) return false;
  const allowed = keys
    .map((k) => routeAccess[k])
    .flat()
    .filter((r, i, arr) => arr.indexOf(r) === i);
  return allowed.length === 0 || allowed.includes(role) || role === "SUPER_ADMIN";
}

// Determine the home landing page for a role.
export function homeForRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/dashboard";
    case "SALES_ADMIN":
      return "/sales/panel";
    case "SHIPPING_ADMIN":
      return "/sales/panel";
    case "FINANCE":
      return "/finance/billing";
    case "PURCHASE_ADMIN":
      return "/purchasing";
    case "SALES":
      return "/sales/panel";
    default:
      return "/products";
  }
}
