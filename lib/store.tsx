"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
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
  BillingSession,
  PriceChangeRequest,
  AppSettings,
  AuditLog,
  Notification,
} from "@/types";
import {
  seedUsers,
  seedBrands,
  seedCategories,
  seedProducts,
  seedSuppliers,
  seedInventory,
  seedCustomers,
  seedSessions,
  seedInvoices,
  seedPayments,
  seedPurchases,
  seedOrders,
  seedCommissions,
  seedMovements,
  seedSettings,
  seedAuditLogs,
  seedNotifications,
} from "./seed";
import { cn } from "@/lib/utils";

type DB = {
  users: User[];
  brands: Brand[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  customers: Customer[];
  sessions: SalesSession[];
  invoices: Invoice[];
  payments: Payment[];
  purchases: PurchaseRequest[];
  orders: SalesOrder[];
  commissions: CommissionTransaction[];
  billing_sessions: BillingSession[];
  price_change_requests: PriceChangeRequest[];
  settings: AppSettings;
  movements: StockMovement[];
  auditLogs: AuditLog[];
  notifications: Notification[];
};

const STORAGE_KEY = "erp_admin_db_v3";

export type ToastItem = {
  id: string;
  title: string;
  message: string;
  type: Notification["type"];
};

interface DataContextValue extends DB {
  reset: () => void;
  // generic helpers
  addAudit: (entry: Omit<AuditLog, "id" | "created_at">) => void;
  notify: (n: Omit<Notification, "id" | "created_at" | "is_read">) => void;
  toasts: ToastItem[];
  toast: (n: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotifRead: () => void;
  clearNotifs: () => void;
  // computed helpers
  recalcInventory: (productId: string) => void;
  recalcCustomerOutstanding: (customerId: string) => void;
  recalcSessionTotals: (sessionId: string) => void;
  // mutation helpers exposed for pages
  setDB: (updater: (db: DB) => DB) => void;
}

const initialDB: DB = {
  users: seedUsers,
  brands: seedBrands,
  categories: seedCategories,
  products: seedProducts,
  suppliers: seedSuppliers,
  inventory: seedInventory,
  customers: seedCustomers,
  sessions: seedSessions,
  invoices: seedInvoices,
  payments: seedPayments,
  purchases: seedPurchases,
  orders: seedOrders,
  commissions: seedCommissions,
  billing_sessions: [],
  price_change_requests: [],
  settings: seedSettings,
  movements: seedMovements,
  auditLogs: seedAuditLogs,
  notifications: seedNotifications,
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

function loadDB(): DB {
  if (typeof window === "undefined") return initialDB;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialDB;
    const parsed = JSON.parse(raw);
    return {
      ...initialDB,
      ...parsed,
      notifications: (parsed.notifications ?? []).filter(
        (n: Notification) => n.target_role
      ),
    };
  } catch {
    return initialDB;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(initialDB);

  useEffect(() => {
    setDb(loadDB());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db]);

  const setDB = useCallback((updater: (db: DB) => DB) => {
    setDb((prev) => updater(prev));
  }, []);

  const reset = useCallback(() => {
    setDb(initialDB);
  }, []);

  const addAudit = useCallback((entry: Omit<AuditLog, "id" | "created_at">) => {
    setDb((prev) => ({
      ...prev,
      auditLogs: [
        {
          ...entry,
          id: `a${Date.now()}`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  }, [setDb]);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (n: Omit<ToastItem, "id">) => {
      const id = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { ...n, id }]);
      window.setTimeout(() => dismissToast(id), 3500);
    },
    [dismissToast]
  );

  const notify = useCallback(
    (n: Omit<Notification, "id" | "created_at" | "is_read">) => {
      toast(n);
      if (!n.target_role) return;
      setDb((prev) => ({
        ...prev,
        notifications: [
          {
            ...n,
            id: `n${Date.now()}`,
            created_at: new Date().toISOString(),
            is_read: false,
          },
          ...prev.notifications,
        ],
      }));
    },
    [setDb, toast]
  );

  const markNotifRead = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      }));
    },
    [setDb]
  );

  const markAllNotifRead = useCallback(() => {
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
    }));
  }, [setDb]);

  const clearNotifs = useCallback(() => {
    setDb((prev) => ({ ...prev, notifications: [] }));
  }, [setDb]);

  const recalcInventory = useCallback(
    (productId: string) => {
      setDb((prev) => ({
        ...prev,
        inventory: prev.inventory.map((inv) => {
          if (inv.product_id !== productId) return inv;
          const available =
            inv.physical_stock - inv.reserved_stock - inv.damaged_stock;
          return { ...inv, available_stock: Math.max(0, available) };
        }),
      }));
    },
    [setDb]
  );

  const recalcCustomerOutstanding = useCallback(
    (customerId: string) => {
      setDb((prev) => {
        const paidInvoices = prev.invoices.filter(
          (i) =>
            i.customer_id === customerId &&
            (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED")
        );
        let paid = 0;
        prev.payments
          .filter((p) => {
            const inv = prev.invoices.find((i) => i.id === p.invoice_id);
            return inv && inv.customer_id === customerId;
          })
          .forEach((p) => (paid += p.amount || 0));
        const total = paidInvoices.reduce((a, i) => a + (i.total || 0), 0);
        const outstanding = Math.max(0, total - paid);
        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === customerId ? { ...c, outstanding } : c
          ),
        };
      });
    },
    [setDb]
  );

  const recalcSessionTotals = useCallback(
    (sessionId: string) => {
      setDb((prev) => {
        // Semua invoice sesi (apa pun statusnya) dihitung sebagai riwayat,
        // sehingga invoice yang baru dibuat langsung tercatat di sesi.
        const sessionInvoices = prev.invoices.filter((i) => i.session_id === sessionId);
        const revenue = sessionInvoices
          .filter(
            (i) => i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED"
          )
          .reduce((a, i) => a + (i.total || 0), 0);
        const commissions = prev.commissions
          .filter((c) => c.session_id === sessionId)
          .reduce((a, c) => a + (c.total_commission || 0), 0);
        return {
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  total_invoices: sessionInvoices.length,
                  total_revenue: revenue,
                  total_commission: commissions,
                }
              : s
          ),
        };
      });
    },
    [setDb]
  );

  const value: DataContextValue = {
    ...db,
    reset,
    addAudit,
    notify,
    toasts,
    toast,
    dismissToast,
    markNotifRead,
    markAllNotifRead,
    clearNotifs,
    recalcInventory,
    recalcCustomerOutstanding,
    recalcSessionTotals,
    setDB,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      <ToastViewport />
    </DataContext.Provider>
  );
}

function ToastViewport() {
  const { toasts, dismissToast } = useData();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={cn(
            "text-left px-3.5 py-2.5 rounded-xl shadow-xl border bg-white",
            t.type === "ERROR"
              ? "border-red-200"
              : t.type === "WARNING"
              ? "border-orange-200"
              : t.type === "SUCCESS"
              ? "border-green-200"
              : "border-blue-200"
          )}
        >
          <p
            className={cn(
              "text-xs font-bold",
              t.type === "ERROR"
                ? "text-red-600"
                : t.type === "WARNING"
                ? "text-orange-600"
                : t.type === "SUCCESS"
                ? "text-green-600"
                : "text-blue-600"
            )}
          >
            {t.title}
          </p>
          <p className="text-[11px] text-brand-gray-dark mt-0.5 leading-snug">
            {t.message}
          </p>
        </button>
      ))}
    </div>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
