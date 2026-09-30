import type {
  User,
  Product,
  Category,
  Brand,
  Supplier,
  Customer,
  InventoryItem,
  StockMovement,
  SalesSession,
  Invoice,
  Payment,
  PurchaseRequest,
  SalesOrder,
  CommissionTransaction,
  AppSettings,
  AuditLog,
  Notification,
} from "@/types";

// ─── Seed: Users ───────────────────────────────────────────────
export const seedUsers: User[] = [
  { id: "u1", name: "Super Admin", email: "superadmin@erp.com", phone: "081111111111", role: "SUPER_ADMIN", allowed_platform: "WEB", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u2", name: "Andi Saputra", email: "andi@erp.com", phone: "082222222222", role: "SALES", allowed_platform: "MOBILE", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u3", name: "Budi Santoso", email: "budi@erp.com", phone: "083333333333", role: "SALES", allowed_platform: "MOBILE", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u4", name: "Citra Dewi", email: "citra@erp.com", phone: "084444444444", role: "SALES", allowed_platform: "MOBILE", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u5", name: "Admin Penjualan", email: "penjualan@erp.com", phone: "085555555555", role: "SALES_ADMIN", allowed_platform: "WEB", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u6", name: "Admin Pengiriman", email: "pengiriman@erp.com", phone: "086666666666", role: "SHIPPING_ADMIN", allowed_platform: "WEB", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u7", name: "Finance", email: "finance@erp.com", phone: "087777777777", role: "FINANCE", allowed_platform: "WEB", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u8", name: "Admin Pembelian", email: "pembelian@erp.com", phone: "088888888888", role: "PURCHASE_ADMIN", allowed_platform: "WEB", status: "ACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
  { id: "u9", name: "Dedi Kurniawan", email: "dedi@erp.com", phone: "089999999999", role: "SALES", allowed_platform: "MOBILE", status: "INACTIVE", created_at: "2026-01-01T08:00:00", updated_at: "2026-01-01T08:00:00" },
];

// Demo passwords (plain for demo; real app would hash)
export const seedCredentials: Record<string, string> = {
  "superadmin@erp.com": "superadmin",
  "andi@erp.com": "andi",
  "budi@erp.com": "budi",
  "citra@erp.com": "citra",
  "penjualan@erp.com": "penjualan",
  "pengiriman@erp.com": "pengiriman",
  "finance@erp.com": "finance",
  "pembelian@erp.com": "pembelian",
};

// ─── Seed: Brands (kosong — dibuat lewat UI) ──────────────────
export const seedBrands: Brand[] = [];

// ─── Seed: Suppliers (kosong — dibuat lewat UI) ───────────────
export const seedSuppliers: Supplier[] = [];

// ─── Seed: App Settings (default) ──────────────────────────────
export const seedSettings: AppSettings = {
  cut_off_days: 30,
  cut_off_enabled: true,
  main_commission_rate: 5,
  own_brand_commission_rate: 5,
  other_brand_commission_rate: 3,
  reminder_h1_enabled: true,
};

// ─── Seed: Categories (kosong — dibuat lewat UI) ───────────────
export const seedCategories: Category[] = [];

export const paymentTerms = [
  { id: "pt0", label: "Cash", days: 0 },
  { id: "pt1", label: "1 Hari", days: 1 },
  { id: "pt7", label: "1 Minggu", days: 7 },
  { id: "pt30", label: "1 Bulan", days: 30 },
  { id: "pt90", label: "3 Bulan", days: 90 },
];

// ─── Seed: Semua data transaksi & master (kosong) ─────────────
export const seedProducts: Product[] = [];

export const seedInventory: InventoryItem[] = [];

export const seedCustomers: Customer[] = [];

export const seedSessions: SalesSession[] = [];

export const seedInvoices: Invoice[] = [];

export const seedPayments: Payment[] = [];

export const seedPurchases: PurchaseRequest[] = [];

export const seedOrders: SalesOrder[] = [];

export const seedCommissions: CommissionTransaction[] = [];

export const seedMovements: StockMovement[] = [];

export const seedAuditLogs: AuditLog[] = [];

export const seedNotifications: Notification[] = [];