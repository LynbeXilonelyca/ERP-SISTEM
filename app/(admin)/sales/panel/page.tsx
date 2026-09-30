"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge, InvoiceStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate, isCustomerCutOff, marginInfo, cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  FilePlus2,
  BarChart3,
  CalendarRange,
  TrendingUp,
  Plus,
  Trash2,
  Package,
  Users,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Truck,
  Wallet,
  Send,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { InvoiceItem, Product, Role } from "@/types";

type Tab = "buat" | "approve" | "sesi" | "progress" | "monitor" | "orderan";

const monthKey = (d: string) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (d: string) => {
  const dt = new Date(d);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(dt);
};

const isCountable = (s: string) => s === "CONFIRMED" || s === "DELIVERED";

// Status yang sedang menunggu tindakan role tertentu.
const AWAITING: Record<string, string> = {
  SALES_ADMIN: "DRAFT",
  SHIPPING_ADMIN: "PENDING_SHIPPING",
  FINANCE: "PENDING_FINANCE",
};

// Alur (urutan pipeline) untuk ditampilkan pada pelacak status.
const PIPELINE: { key: string; label: string; icon: "file" | "super" | "ship" | "fin" | "done" }[] = [
  { key: "DRAFT", label: "Dibuat Sales", icon: "file" },
  { key: "PENDING_SHIPPING", label: "Disetujui Sales Admin", icon: "file" },
  { key: "PENDING_FINANCE", label: "Pengiriman", icon: "ship" },
  { key: "CONFIRMED", label: "Finance", icon: "fin" },
];

const pipelineIndex = (status: string) => {
  if (status === "DRAFT") return 0;
  if (status === "PENDING_SHIPPING") return 1;
  if (status === "PENDING_FINANCE") return 2;
  if (status === "CONFIRMED" || status === "DELIVERED") return 3;
  return -1;
};

export default function SalesPanelPage() {
  const { users, invoices, sessions, customers, products, orders, settings, setDB, notify, addAudit, recalcSessionTotals } =
    useData();
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const myName = user?.name ?? "";
  const role: Role = user?.role ?? "SUPER_ADMIN";
  const isAdmin = role === "SALES_ADMIN";
  const canCreate = role === "SALES" || role === "SALES_ADMIN";

  // â”€â”€ Orderan (jalur purchase â†’ sales â†’ finance) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const myOrders = useMemo(() => {
    const base = role === "SALES" ? orders.filter((o) => o.sales_id === myId) : orders;
    return [...base].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, role, myId]);

  const acceptOrder = (o: (typeof orders)[number]) => {
    setDB((db) => ({
      ...db,
      orders: db.orders.map((x) => (x.id === o.id ? { ...x, status: "APPROVED_BY_SALES" as const } : x)),
    }));
    addAudit({ user_name: myName, user_role: role, action: "APPROVE", module: "ORDER", record_id: o.order_code, old_value: "AWAITING_SALES", new_value: "APPROVED_BY_SALES", ip_address: "local", device: "Web" });
    notify({ title: "Orderan Diterima", message: `${myName} mengonfirmasi barang ${o.order_code} (${o.supplier_name}) tersedia â€” diteruskan ke Finance.`, type: "SUCCESS", target_role: "FINANCE" });
  };

  const rejectOrder = (o: (typeof orders)[number]) => {
    setDB((db) => ({
      ...db,
      orders: db.orders.map((x) => (x.id === o.id ? { ...x, status: "REJECTED_BY_SALES" as const } : x)),
    }));
    addAudit({ user_name: myName, user_role: role, action: "REJECT", module: "ORDER", record_id: o.order_code, old_value: "AWAITING_SALES", new_value: "REJECTED_BY_SALES", ip_address: "local", device: "Web" });
    notify({ title: "Orderan Ditolak Sales", message: `${myName} melaporkan barang ${o.order_code} (${o.supplier_name}) tidak tersedia â€” menunggu tindakan lanjut.`, type: "ERROR", target_role: "PURCHASE_ADMIN" });
  };

  const [tab, setTab] = useState<Tab>(canCreate ? "buat" : "approve");

  // â”€â”€ State untuk Buat Invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [targetSalesId, setTargetSalesId] = useState(myId);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [lineItems, setLineItems] = useState<{ productId: string; qty: number }[]>([
    { productId: "", qty: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // â”€â”€ State untuk proses persetujuan pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [curId, setCurId] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  // â”€â”€ State untuk SHIPPING_ADMIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [shippingDate, setShippingDate] = useState("");
  const [returOpen, setReturOpen] = useState(false);
  const [returReason, setReturReason] = useState("");

  // â”€â”€ State untuk FINANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [financeNote, setFinanceNote] = useState("");

  // â”€â”€ Sales aktif â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const salesUsers = useMemo(
    () =>
      users
        .filter((u) => u.role === "SALES" && u.status === "ACTIVE")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const effectiveSalesId = isAdmin ? targetSalesId : myId;

  const mySessions = useMemo(
    () => sessions.filter((s) => s.sales_id === effectiveSalesId),
    [sessions, effectiveSalesId]
  );
  const myInvoices = useMemo(
    () => invoices.filter((i) => i.sales_id === effectiveSalesId),
    [invoices, effectiveSalesId]
  );
  const myCustomers = useMemo(
    () =>
      customers
        .filter((c) => c.sales_id === effectiveSalesId && c.status === "ACTIVE")
        .sort((a, b) => a.store_name.localeCompare(b.store_name)),
    [customers, effectiveSalesId]
  );
  const activeProducts = useMemo(() => products.filter((p) => p.status === "ACTIVE"), [products]);
  const activeSession = mySessions.find((s) => s.status === "ACTIVE");
  const activeSessId = activeSession?.id ?? "";

  const selectedCust = myCustomers.find((c) => c.id === selectedCustomer);
  const selectedCustCutOff = selectedCust ? isCustomerCutOff(selectedCust.id, invoices, settings) : false;
  const terms = useMemo(() => {
    if (!selectedCust?.payment_term_id) return [];
    return [{ value: selectedCust.payment_term_id, label: selectedCust.payment_term_label }];
  }, [selectedCust]);

  const productOf = (id: string) => activeProducts.find((p) => p.id === id);
  const priceFor = (product: Product, term: string) => {
    const price = product.prices.find((p) => p.payment_term_id === term);
    return price?.price ?? product.prices[0]?.price ?? 0;
  };
  const subtotal = lineItems.reduce((acc, li) => {
    const p = productOf(li.productId);
    return acc + (p ? priceFor(p, selectedTerm) * (li.qty || 0) : 0);
  }, 0);
  const total = Math.max(0, subtotal - (discount || 0));
  const isInvoiceValid =
    !!selectedCustomer && !!selectedTerm && !!activeSessId && lineItems.some((li) => li.productId && (li.qty || 0) > 0) && !selectedCustCutOff;

  const addLine = () => setLineItems((prev) => [...prev, { productId: "", qty: 0 }]);
  const updateLine = (idx: number, patch: Partial<{ productId: string; qty: number }>) =>
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  const removeLine = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const invoiceCount = invoices.length + 1;

  const createInvoice = () => {
    if (!selectedCust || !activeSessId || !selectedTerm) return;
    const items: InvoiceItem[] = lineItems
      .filter((li) => li.productId && (li.qty || 0) > 0)
      .map((li, i) => {
        const p = productOf(li.productId)!;
        const price = priceFor(p, selectedTerm);
        return {
          id: `ii${Date.now()}-${i}`,
          product_id: p.id,
          product_name: p.name,
          sku: p.sku,
          quantity: li.qty,
          cost_at_transaction: p.cost_price,
          standard_price: p.prices[0]?.price ?? price,
          selling_price: price,
          subtotal: price * li.qty,
          payment_term: selectedTerm,
        };
      });

    const now = new Date();
    const salesName = salesUsers.find((u) => u.id === effectiveSalesId)?.name ?? myName;
    const num = `INV-${now.getFullYear()}-${String(900 + invoiceCount).padStart(4, "0")}`;
    // Sales -> DRAFT (menunggu Sales Admin). Sales Admin -> langsung Pengiriman.
    const startStatus = role === "SALES" ? "DRAFT" : "PENDING_SHIPPING";
    const newInvoice = {
      id: `inv${Date.now()}`,
      invoice_number: num,
      session_id: activeSessId,
      sales_id: effectiveSalesId,
      sales_name: salesName,
      customer_id: selectedCust.id,
      customer_name: selectedCust.store_name,
      store_name: selectedCust.store_name,
      items,
      payment_term_id: selectedCust.payment_term_id,
      payment_term_label: selectedCust.payment_term_label,
      subtotal,
      discount: discount || 0,
      total,
      invoice_status: startStatus as "DRAFT" | "PENDING_SHIPPING",
      payment_status: "UNPAID" as const,
      shipping_status: "PENDING" as const,
      print_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    setDB((db) => ({
      ...db,
      invoices: [...db.invoices, newInvoice as (typeof db.invoices)[number]],
    }));
    recalcSessionTotals(activeSessId);
    notify({
      title: startStatus === "DRAFT" ? "Invoice Terkirim untuk Review" : "Invoice Dibuat & Masuk Alur Persetujuan",
      message:
        startStatus === "DRAFT"
          ? `${num} untuk ${selectedCust.store_name} menunggu persetujuan Admin Penjualan.`
          : `${num} untuk ${selectedCust.store_name} dikirim ke Super Admin untuk validasi.`,
      type: "INFO",
    });
    setConfirmOpen(false);
    setLineItems([{ productId: "", qty: 0 }]);
    setDiscount(0);
    setSelectedTerm("");
    setSelectedCustomer("");
  };

  // â”€â”€ Pipeline per role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const awaitingStatus = AWAITING[role] ?? "";
  const awaitingInvoices = useMemo(() => {
    if (!awaitingStatus) return [];
    return invoices
      .filter((i) => i.invoice_status === awaitingStatus)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [invoices, awaitingStatus]);

  const curInvoice = awaitingInvoices.find((i) => i.id === curId) ?? null;
  const curTerm =
    curInvoice?.items?.[0]?.payment_term ?? curInvoice?.payment_term_id ?? "";

  // Editor item (Sales Admin) â€” muat ulang saat invoice dipilih
  const [reviewItems, setReviewItems] = useState<InvoiceItem[]>([]);
  const [reviewDiscount, setReviewDiscount] = useState(0);
  const [addProductId, setAddProductId] = useState("");

  const loadCur = (id: string) => {
    setCurId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setReviewItems(inv.items ?? []);
      setReviewDiscount(inv.discount ?? 0);
      setChangeNote(inv.change_note ?? "");
    } else {
      setReviewItems([]);
      setReviewDiscount(0);
      setChangeNote("");
    }
    setAddProductId("");
    setShippingDate(inv?.shipping_date ?? "");
    setFinanceNote("");
  };

  const reviewSubtotal = reviewItems.reduce((a, it) => a + (it.selling_price || 0) * it.quantity, 0);
  const reviewTotal = Math.max(0, reviewSubtotal - reviewDiscount);

  // Tidak ada perubahan berarti item & diskon review sama persis dengan invoice asli.
  const reviewUnchanged =
    JSON.stringify(reviewItems.map((it) => [it.product_id, it.quantity, it.selling_price])) ===
      JSON.stringify(
        curInvoice?.items?.map((it) => [it.product_id, it.quantity, it.selling_price]) ?? []
      ) &&
    (reviewDiscount ?? 0) === (curInvoice?.discount ?? 0);

  const changeReviewQty = (idx: number, qty: number) =>
    setReviewItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, quantity: qty, subtotal: it.selling_price * qty } : it))
    );
  const removeReviewItem = (idx: number) => setReviewItems((prev) => prev.filter((_, i) => i !== idx));
  const addReviewItem = () => {
    const p = activeProducts.find((x) => x.id === addProductId);
    if (!p) return;
    const sell = p.prices.find((pp) => pp.payment_term_id === curTerm)?.price ?? p.prices[0]?.price ?? 0;
    setReviewItems((prev) => [
      ...prev,
      {
        id: `ri${Date.now()}`,
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        quantity: p.minimum_order || 1,
        cost_at_transaction: p.cost_price,
        standard_price: p.prices[0]?.price ?? sell,
        selling_price: sell,
        subtotal: sell * (p.minimum_order || 1),
        payment_term: curTerm,
      },
    ]);
    setAddProductId("");
  };

  // Tindakan per role
  const rejectInvoice = () => {
    if (!curInvoice) return;
    setDB((db) => ({
      ...db,
      invoices: db.invoices.map((inv) =>
        inv.id === curInvoice.id
          ? { ...inv, invoice_status: "CANCELLED" as const, updated_at: new Date().toISOString() }
          : inv
      ),
    }));
    notify({ title: "Invoice Ditolak", message: `${curInvoice.invoice_number} ditolak.`, type: "ERROR" });
    setCurId("");
    setReviewItems([]);
    setReviewDiscount(0);
    setChangeNote("");
    setShippingDate("");
  };

  const processFinance = () => {
    if (!curInvoice) return;
    setDB((db) => ({
      ...db,
      invoices: db.invoices.map((inv) =>
        inv.id === curInvoice.id
          ? {
              ...inv,
              invoice_status: "CONFIRMED" as const,
              payment_status: "PAID" as const,
              shipping_date: shippingDate || inv.shipping_date,
              notes: financeNote || inv.notes,
              updated_at: new Date().toISOString(),
            }
          : inv
      ),
    }));
    recalcSessionTotals(curInvoice.session_id);
    notify({ title: "Invoice Diselesaikan", message: `${curInvoice.invoice_number} telah diselesaikan oleh Finance.`, type: "SUCCESS" });
    setCurId("");
    setFinanceNote("");
  };

  const approveFromSalesAdmin = () => {
    if (!curInvoice) return;
    setDB((db) => ({
      ...db,
      invoices: db.invoices.map((inv) =>
        inv.id === curInvoice.id
          ? {
              ...inv,
              items: reviewItems,
              discount: reviewDiscount,
              subtotal: reviewSubtotal,
              total: reviewTotal,
              change_note: changeNote,
              invoice_status: "PENDING_SHIPPING",
              updated_at: new Date().toISOString(),
            }
          : inv
      ),
    }));
    notify({
      title: "Disetujui, Diteruskan ke Admin Pengiriman",
      message: `${curInvoice.invoice_number} disetujui Admin Penjualan dan langsung diteruskan ke Admin Pengiriman.`,
      type: "SUCCESS",
      target_role: "SHIPPING_ADMIN",
    });
    setApproveConfirmOpen(false);
    setCurId("");
    setReviewItems([]);
    setReviewDiscount(0);
    setChangeNote("");
  };

  const confirmApprove = () => {
    approveFromSalesAdmin();
  };

  const submitShipping = () => {
    if (!curInvoice) return;
    setDB((db) => ({
      ...db,
      invoices: db.invoices.map((inv) =>
        inv.id === curInvoice.id
          ? { ...inv, shipping_date: shippingDate, invoice_status: "PENDING_FINANCE" as const, updated_at: new Date().toISOString() }
          : inv
      ),
    }));
    notify({ title: "Tanggal Dikirim", message: `${curInvoice.invoice_number} dikirim ke Finance.`, type: "SUCCESS" });
    setCurId("");
    setShippingDate("");
  };

  const createRetur = () => {
    if (!curInvoice) return;
    const now = new Date();
    const returNum = `RET-${now.getFullYear()}-${String(100 + returCount).padStart(4, "0")}`;
    setDB((db) => ({
      ...db,
      invoices: [
        ...db.invoices,
        {
          ...curInvoice,
          id: `ret${Date.now()}`,
          invoice_number: returNum,
          invoice_status: "RETURNED" as const,
          total: curInvoice.total,
          notes: returReason || "Retur",
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        } as (typeof db.invoices)[number],
      ],
    }));
    notify({ title: "Invoice Retur Dibuat", message: `${returNum} merujuk ${curInvoice.invoice_number}.`, type: "SUCCESS" });
    setReturOpen(false);
    setReturReason("");
  };
  const returCount = invoices.filter((i) => i.invoice_number.startsWith("RET-")).length + 1;

  // â”€â”€ Sesi per Bulan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sessionRows = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; invoices: number; commission: number; sessions: typeof mySessions }>();
    mySessions.forEach((s) => {
      const key = monthKey(s.start_date);
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, invoices: 0, commission: 0, sessions: [] });
      const entry = map.get(key)!;
      entry.revenue += s.total_revenue || 0;
      entry.invoices += s.total_invoices || 0;
      entry.commission += s.total_commission || 0;
      entry.sessions.push(s);
    });
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [mySessions]);

  const totalCommission = mySessions.reduce((a, s) => a + (s.total_commission || 0), 0);

  // â”€â”€ Progress & Perbandingan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const nowK = monthKey(new Date().toISOString());
  const thisRevenue = myInvoices
    .filter((i) => monthKey(i.created_at) === nowK && isCountable(i.invoice_status))
    .reduce((a, i) => a + i.total, 0);
  const lastRevenue = myInvoices
    .filter((i) => monthKey(i.created_at) !== nowK && isCountable(i.invoice_status))
    .reduce((a, i) => a + i.total, 0);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; invoices: number }>();
    myInvoices.forEach((i) => {
      const key = monthKey(i.created_at);
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, invoices: 0 });
      const e = map.get(key)!;
      if (isCountable(i.invoice_status)) e.revenue += i.total;
      e.invoices += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((e) => ({
        ...e,
        label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(e.month)),
      }));
  }, [myInvoices]);

  // â”€â”€ Monitoring (SALES_ADMIN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const monitorRows = useMemo(() => {
    return salesUsers.map((su) => {
      const inv = invoices.filter((i) => i.sales_id === su.id && (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED"));
      const sess = sessions.filter((s) => s.sales_id === su.id);
      const custCount = customers.filter((c) => c.sales_id === su.id && c.status === "ACTIVE").length;
      const monthInv = invoices.filter(
        (i) => i.sales_id === su.id && (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED") && monthKey(i.created_at) === nowK
      );
      return {
        id: su.id,
        name: su.name,
        active: sess.some((s) => s.status === "ACTIVE"),
        revenue: inv.reduce((a, i) => a + i.total, 0),
        monthRevenue: monthInv.reduce((a, i) => a + i.total, 0),
        invoices: inv.length,
        commission: sess.reduce((a, s) => a + (s.total_commission || 0), 0),
        customers: custCount,
        sessions: sess.length,
      };
    });
  }, [salesUsers, invoices, sessions, customers, nowK]);

  const monitorTotal = useMemo(() => {
    return monitorRows.reduce(
      (a, m) => ({ revenue: a.revenue + m.revenue, invoices: a.invoices + m.invoices, commission: a.commission + m.commission, customers: a.customers + m.customers }),
      { revenue: 0, invoices: 0, commission: 0, customers: 0 }
    );
  }, [monitorRows]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: "buat", label: "Buat Invoice", icon: <FilePlus2 className="w-4 h-4" />, show: canCreate },
    { key: "approve", label: "Persetujuan Alur", icon: <ClipboardList className="w-4 h-4" />, show: !!awaitingStatus },
    { key: "sesi", label: "Sesi per Bulan", icon: <CalendarRange className="w-4 h-4" />, show: role === "SALES" || isAdmin },
    { key: "progress", label: "Progress & Perbandingan", icon: <BarChart3 className="w-4 h-4" />, show: role === "SALES" || isAdmin },
    { key: "monitor", label: "Monitoring Sales", icon: <Users className="w-4 h-4" />, show: isAdmin },
    { key: "orderan", label: "Orderan", icon: <Package className="w-4 h-4" />, show: role === "SALES" || isAdmin || role === "SUPER_ADMIN" },
  ];

  const approveBtnLabel =
    role === "SALES_ADMIN" ? "Approve & Kirim" : role === "FINANCE" ? "Selesaikan" : "Approve";
  const approveBtnIcon =
    role === "SHIPPING_ADMIN" ? <Send className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel Sales"
        breadcrumbs={[{ label: "Home" }, { label: "Sales Panel" }]}
      />

      {!activeSessId && canCreate && (
        <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
          <p className="text-xs text-brand-gray-dark">
            Belum ada sesi penjualan aktif. Minta Super Admin membuat sesi untuk memulai transaksi.
          </p>
        </div>
      )}

      {/* Tab */}
      <div className="flex flex-wrap gap-2 border-b border-brand-gray-border pb-px">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors " +
                (tab === t.key
                  ? "border-brand-yellow text-brand-black bg-brand-yellow/10"
                  : "border-transparent text-brand-gray-mid hover:text-brand-black hover:bg-brand-bg")
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
      </div>

      {tab === "buat" && canCreate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="section-title">Detail Invoice</p>
              <Badge variant={activeSessId ? "yellow" : "gray"}>
                {activeSession?.session_code ?? "Tidak ada sesi aktif"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAdmin && (
                <Select
                  label="Sales"
                  placeholder="Pilih sales"
                  value={targetSalesId}
                  onChange={(e) => {
                    setTargetSalesId(e.target.value);
                    setSelectedCustomer("");
                    setSelectedTerm("");
                  }}
                  options={salesUsers.map((s) => ({ value: s.id, label: s.name }))}
                />
              )}
              <Select
                label="Customer"
                placeholder="Pilih customer"
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  const c = myCustomers.find((x) => x.id === e.target.value);
                  setSelectedTerm(c?.payment_term_id ?? "");
                }}
                options={myCustomers.map((c) => ({
                  value: c.id,
                  label: `${c.store_name} â€” ${c.city}`,
                }))}
              />
              <Select
                label="Payment Term"
                placeholder="Pilih term"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                options={terms}
              />
            </div>

            {selectedCustCutOff && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-600">Customer ini sedang kena Cut Off.</p>
                  <p className="text-[10px] text-red-500">Pembuatan invoice diblokir karena ada piutang yang belum lunas melewati tenggat {settings.cut_off_days} hari. Minta Super Admin lakukan pembayaran terlebih dahulu.</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide">Item</p>
                <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />} onClick={addLine}>
                  Tambah Item
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((li, idx) => {
                  const p = productOf(li.productId);
                  const price = p ? priceFor(p, selectedTerm) : 0;
                  const margin = p ? marginInfo(price, p.cost_price) : null;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="grid grid-cols-[1fr_90px_auto] gap-2 items-end">
                        <Select
                          placeholder="Pilih produk"
                          value={li.productId}
                          onChange={(e) => updateLine(idx, { productId: e.target.value })}
                          options={activeProducts.map((pr) => ({
                            value: pr.id,
                            label: `${pr.name} â€” ${formatCurrency(priceFor(pr, selectedTerm))}`,
                          }))}
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          min={p?.minimum_order ?? 1}
                          value={li.qty || ""}
                          onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                        />
                        <button
                          onClick={() => removeLine(idx)}
                          className="p-2 rounded-lg hover:bg-red-50 text-brand-gray-mid hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {margin && (
                        <p className={cn("text-[10px] font-semibold flex items-center gap-1",
                          margin.level === "danger" ? "text-red-500" : margin.level === "warning" ? "text-orange-500" : "text-green-600")}>
                          {margin.level === "danger" ? <XCircle className="w-3 h-3" /> : margin.level === "warning" ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          Harga modal {formatCurrency(p!.cost_price)} Â· {margin.message}
                        </p>
                      )}
                    </div>
                  );
                })}
                {lineItems.length === 0 && <p className="text-xs text-brand-gray-light">Belum ada item.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Diskon (Rp)"
                type="number"
                placeholder="0"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
              <div className="bg-brand-bg rounded-xl p-3 flex flex-col gap-1 self-end">
                <div className="flex justify-between text-xs text-brand-gray-mid">
                  <span>Subtotal</span>
                  <span className="font-semibold text-brand-black">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-brand-black">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button icon={<FilePlus2 className="w-4 h-4" />} disabled={!isInvoiceValid} onClick={() => setConfirmOpen(true)}>
                Buat Invoice
              </Button>
            </div>
          </div>

          <div className="card flex flex-col gap-3 self-start">
            <p className="section-title">Ringkasan Sesi</p>
            <StatCard title="Revenue Sesi Ini" value={formatCurrency(activeSession?.total_revenue ?? 0)} icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard title="Invoice Sesi Ini" value={String(activeSession?.total_invoices ?? 0)} icon={<Package className="w-4 h-4" />} />
            <p className="text-[10px] text-brand-gray-light">
              Invoice yang dibuat akan masuk alur persetujuan dan belum menambah revenue sampai disetujui.
            </p>
          </div>
        </div>
      )}

      {tab === "approve" && !!awaitingStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daftar invoice menunggu role ini */}
          <div className="card p-0 overflow-hidden self-start">
            <div className="p-4 border-b border-brand-gray-border flex items-center justify-between">
              <div>
                <p className="section-title">Menunggu {roleLabel(role)}</p>
                <p className="text-xs text-brand-gray-light mt-0.5">
                  {role === "SHIPPING_ADMIN" ? "Atur tanggal kirim + retur, lalu kirim ke Finance." : role === "FINANCE" ? "Selesaikan invoice pengiriman." : `Total ${awaitingInvoices.length} invoice.`}
                </p>
              </div>
              <Badge variant="yellow">{awaitingInvoices.length}</Badge>
            </div>
            <div className="divide-y divide-brand-gray-border max-h-[560px] overflow-y-auto">
              {awaitingInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => loadCur(inv.id)}
                  className={
                    "w-full text-left px-4 py-3 flex justify-between items-center gap-3 transition-colors " +
                    (curId === inv.id ? "bg-brand-yellow/10" : "hover:bg-brand-bg")
                  }
                >
                  <div>
                    <p className="text-sm font-bold text-brand-black">{inv.invoice_number}</p>
                    <p className="text-xs text-brand-gray-light mt-0.5">
                      {inv.store_name} Â· {salesUsers.find((u) => u.id === inv.sales_id)?.name ?? inv.sales_name}
                    </p>
                    <p className="text-[10px] text-brand-gray-light">{formatDate(inv.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-black">{formatCurrency(inv.total)}</p>
                    <InvoiceStatusBadge status={inv.invoice_status} />
                  </div>
                </button>
              ))}
              {awaitingInvoices.length === 0 && (
                <p className="p-6 text-sm text-brand-gray-light text-center">
                  Tidak ada invoice yang menunggu tindakan Anda.
                </p>
              )}
            </div>
          </div>

          {/* Panel aksi per role */}
          <div className="card flex flex-col gap-4 self-start">
            {!curInvoice ? (
              <p className="text-sm text-brand-gray-light py-8 text-center">
                Pilih invoice di kiri untuk diproses.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">{curInvoice.invoice_number}</p>
                    <p className="text-xs text-brand-gray-light mt-0.5">
                      {curInvoice.store_name} Â· {curInvoice.payment_term_label}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={curInvoice.invoice_status} />
                </div>

                {/* Pelacak status pipeline */}
                <PipelineTracker status={curInvoice.invoice_status} />

                {curInvoice.change_note && (
                  <div className="bg-brand-bg rounded-xl p-3 text-xs">
                    <p className="font-bold text-brand-black mb-1">Catatan Perubahan (dari Sales Admin):</p>
                    <p className="text-brand-gray-mid">{curInvoice.change_note}</p>
                  </div>
                )}
                {curInvoice.shipping_date && (
                  <div className="bg-brand-bg rounded-xl p-3 text-xs">
                    <p className="font-bold text-brand-black mb-1">Tanggal Kirim:</p>
                    <p className="text-brand-gray-mid">{formatDate(curInvoice.shipping_date)}</p>
                  </div>
                )}

                {role === "SALES_ADMIN" && (
                  <>
                    <div className="flex gap-2 items-end">
                      <Select
                        label="Tambah item permintaan"
                        placeholder="Pilih produk dari katalog"
                        value={addProductId}
                        onChange={(e) => setAddProductId(e.target.value)}
                        options={activeProducts.map((p) => ({
                          value: p.id,
                          label: `${p.name} â€” ${formatCurrency(p.prices.find((pp) => pp.payment_term_id === curTerm)?.price ?? p.prices[0]?.price ?? 0)}`,
                        }))}
                      />
                      <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={addReviewItem} disabled={!addProductId}>
                        Tambah
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {reviewItems.map((it, idx) => (
                        <div key={it.id} className="grid grid-cols-[1fr_70px_90px_auto] gap-2 items-center bg-brand-bg rounded-xl p-2">
                          <div>
                            <p className="text-xs font-semibold text-brand-black">{it.product_name}</p>
                            <p className="text-[10px] text-brand-gray-light">{formatCurrency(it.selling_price)} / unit</p>
                          </div>
                          <Input type="number" value={it.quantity || ""} min={1} onChange={(e) => changeReviewQty(idx, Number(e.target.value))} />
                          <span className="text-xs font-bold text-brand-black text-right">{formatCurrency(it.selling_price * it.quantity)}</span>
                          <button onClick={() => removeReviewItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-gray-mid hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {reviewItems.length === 0 && <p className="text-xs text-brand-gray-light">Belum ada item.</p>}
                    </div>
                    <Textarea
                      label="Catatan Perubahan (kenapa diubah?)"
                      placeholder="Contoh: qty produk disesuaikan permintaan customer di luar sistem"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                    />
                    <p className="text-[10px] text-brand-gray-light">
                      {reviewUnchanged
                        ? "Tanpa perubahan â€” invoice langsung ke Admin Pengiriman (tanpa persetujuan Super Admin)."
                        : "Ada perubahan pada item/diskon â€” invoice akan diminta persetujuan Super Admin dulu sebelum ke Pengiriman."}
                    </p>
                  </>
                )}

                {role === "SHIPPING_ADMIN" && (
                  <>
                    <Input
                      label="Tanggal Kirim"
                      type="date"
                      value={shippingDate}
                      onChange={(e) => setShippingDate(e.target.value)}
                    />
                    <div className="bg-brand-bg rounded-xl p-3 text-xs space-y-1">
                      {curInvoice.items?.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>{it.product_name} Ã— {it.quantity}</span>
                          <span className="font-semibold">{formatCurrency(it.selling_price * it.quantity)}</span>
                        </div>
                      ))}
                      <div className="border-t border-brand-gray-border pt-1 flex justify-between font-bold text-brand-black">
                        <span>Total</span>
                        <span>{formatCurrency(curInvoice.total)}</span>
                      </div>
                    </div>
                    <Button variant="secondary" icon={<Package className="w-4 h-4" />} onClick={() => setReturOpen(true)}>
                      Buat Invoice Retur
                    </Button>
                  </>
                )}

                {role === "FINANCE" && (
                  <>
                    <Input
                      label="Tanggal Kirim*"
                      type="date"
                      value={shippingDate}
                      onChange={(e) => setShippingDate(e.target.value)}
                    />
                    <div className="bg-brand-bg rounded-xl p-3 text-xs space-y-1">
                      {curInvoice.items?.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>{it.product_name} Ã— {it.quantity}</span>
                          <span className="font-semibold">{formatCurrency(it.selling_price * it.quantity)}</span>
                        </div>
                      ))}
                      <div className="border-t border-brand-gray-border pt-1 flex justify-between font-bold text-brand-black">
                        <span>Total</span>
                        <span>{formatCurrency(curInvoice.total)}</span>
                      </div>
                    </div>
                    <Textarea
                      label="Catatan Finance (opsional)"
                      placeholder="Metode pembayaran / keterangan"
                      value={financeNote}
                      onChange={(e) => setFinanceNote(e.target.value)}
                    />
                  </>
                )}

                <div className="flex justify-end gap-2">
                  {(role === "SALES_ADMIN" || role === "SUPER_ADMIN") && (
                    <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={rejectInvoice}>
                      Tolak
                    </Button>
                  )}
                  {role === "SALES_ADMIN" && (
                    <Button
                      icon={approveBtnIcon}
                      disabled={reviewItems.length === 0 || reviewItems.some((it) => !it.quantity || it.quantity <= 0)}
                      onClick={() => setApproveConfirmOpen(true)}
                    >
                      Approve & Kirim
                    </Button>
                  )}
                  {role === "SUPER_ADMIN" && (
                    <Button icon={approveBtnIcon} onClick={() => setApproveConfirmOpen(true)}>
                      Approve & Kirim ke Pengiriman
                    </Button>
                  )}
                  {role === "SHIPPING_ADMIN" && (
                    <Button icon={approveBtnIcon} disabled={!shippingDate} onClick={submitShipping}>
                      Set & Kirim ke Finance
                    </Button>
                  )}
                  {role === "FINANCE" && (
                    <Button icon={<Wallet className="w-4 h-4" />} disabled={!shippingDate} onClick={processFinance}>
                      Selesaikan Invoice
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "sesi" && (role === "SALES" || isAdmin) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Sesi" value={String(mySessions.length)} icon={<CalendarRange className="w-4 h-4" />} />
            <StatCard title="Revenue Terkonfirmasi" value={formatCurrency(myInvoices.filter((i) => isCountable(i.invoice_status)).reduce((a, i) => a + i.total, 0))} icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard title="Komisi" value={formatCurrency(totalCommission)} icon={<BarChart3 className="w-4 h-4" />} />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-brand-gray-border">
              <p className="section-title">Sesi penjualan {isAdmin ? "per sales" : "saya"} per bulan</p>
            </div>
            <div className="space-y-3 p-4">
              {sessionRows.length === 0 && <p className="text-sm text-brand-gray-light">Belum ada sesi.</p>}
              {sessionRows.map((row) => (
                <div key={row.month} className="bg-brand-bg rounded-2xl p-3">
                  <p className="text-xs font-bold text-brand-black mb-2">{monthLabel(row.month)}</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Revenue</p>
                      <p className="text-sm font-bold text-brand-black">{formatCurrency(row.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Invoice</p>
                      <p className="text-sm font-bold text-brand-black">{row.invoices}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Komisi</p>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(row.commission)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {row.sessions.map((s) => (
                      <Badge key={s.id} variant={s.status === "ACTIVE" ? "yellow" : s.status === "DONE" ? "success" : "info"}>
                        {s.session_code} Â· {s.status.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {myInvoices
                      .filter((inv) => row.sessions.some((s) => s.id === inv.session_id))
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold text-brand-black truncate">{inv.invoice_number}</span>
                            <span className="text-[10px] text-brand-gray-light whitespace-nowrap">{formatDate(inv.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <InvoiceStatusBadge status={inv.invoice_status} />
                            <span className="text-xs font-bold text-brand-black">{formatCurrency(inv.total)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "progress" && (role === "SALES" || isAdmin) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Revenue Bulan Ini" value={formatCurrency(thisRevenue)} subtitle={monthLabel(nowK)} icon={<TrendingUp className="w-4 h-4" />} accent />
            <StatCard title="Revenue Sebelumnya" value={formatCurrency(lastRevenue)} subtitle="Di luar bulan berjalan" icon={<BarChart3 className="w-4 h-4" />} />
            <StatCard
              title="Selisih"
              value={formatCurrency(thisRevenue - lastRevenue)}
              subtitle="Bulan ini vs sebelumnya"
              trend={lastRevenue > 0 ? Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 1000) / 10 : thisRevenue > 0 ? 100 : 0}
              trendLabel="vs periode lalu"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard title="Komisi" value={formatCurrency(totalCommission)} subtitle="Semua sesi" icon={<BarChart3 className="w-4 h-4" />} />
          </div>
          <div className="card">
            <p className="section-title mb-4">Progress & Perbandingan per Bulan â€” Invoice (semua status) & Revenue (terkonfirmasi)</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}jt`} />
                <Tooltip formatter={(v: number, name: string) => (name === "Revenue" ? [formatCurrency(v), name] : [String(v), name])} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#feda00" radius={[6, 6, 0, 0]} />
                <Bar dataKey="invoices" name="Invoice" fill="#60a5fa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "monitor" && isAdmin && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Sales Aktif" value={String(salesUsers.length)} icon={<Users className="w-4 h-4" />} />
            <StatCard title="Revenue Total" value={formatCurrency(monitorTotal.revenue)} icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard title="Invoice Total" value={String(monitorTotal.invoices)} icon={<Package className="w-4 h-4" />} />
            <StatCard title="Komisi Total" value={formatCurrency(monitorTotal.commission)} icon={<BarChart3 className="w-4 h-4" />} />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-brand-gray-border">
              <p className="section-title">Aktifitas Sales</p>
            </div>
            <div className="divide-y divide-brand-gray-border">
              {monitorRows.map((m) => (
                <div key={m.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-brand-black">{m.name}</span>
                      <span className={`w-2 h-2 rounded-full ${m.active ? "bg-green-500" : "bg-brand-gray-light"}`} title={m.active ? "Ada sesi aktif" : "Tidak ada sesi aktif"} />
                    </div>
                    <p className="text-xs text-brand-gray-light mt-0.5">{m.customers} customer Â· {m.sessions} sesi</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Revenue</p>
                      <p className="text-sm font-bold text-brand-black">{formatCurrency(m.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Bulan Ini</p>
                      <p className="text-sm font-bold text-brand-yellow-dark">{formatCurrency(m.monthRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Invoice</p>
                      <p className="text-sm font-bold text-brand-black">{m.invoices}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-gray-light uppercase">Komisi</p>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(m.commission)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {monitorRows.length === 0 && <p className="p-4 text-sm text-brand-gray-light">Belum ada sales aktif.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "orderan" && (role === "SALES" || isAdmin || role === "SUPER_ADMIN") && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Orderan Masuk" value={String(myOrders.filter((o) => o.status === "AWAITING_SALES").length)} icon={<Package className="w-4 h-4" />} />
            <StatCard title="Diterima" value={String(myOrders.filter((o) => o.status === "APPROVED_BY_SALES" || o.status === "INVOICE_PENDING" || o.status === "COMPLETED").length)} icon={<CheckCircle2 className="w-4 h-4" />} />
            <StatCard title="Ditolak Sales" value={String(myOrders.filter((o) => o.status === "REJECTED_BY_SALES").length)} icon={<XCircle className="w-4 h-4" />} />
            <StatCard title="Total Nilai" value={formatCurrency(myOrders.reduce((a, o) => a + o.total_amount, 0))} icon={<Wallet className="w-4 h-4" />} />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-brand-gray-border">
              <p className="section-title">Orderan dari Pengadaan</p>
              <p className="text-xs text-brand-gray-light">Order tercipta otomatis saat purchase disetujui Super Admin. Cek ketersediaan barang, lalu terima atau tolak.</p>
            </div>
            <div className="divide-y divide-brand-gray-border">
              {myOrders.length === 0 && <p className="p-4 text-sm text-brand-gray-light">Belum ada orderan.</p>}
              {myOrders.map((o) => (
                <div key={o.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-bold text-brand-black">
                      {o.order_code}
                      {o.status === "AWAITING_SALES" && <span className="ml-2 text-[9px] font-bold uppercase bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md">Perlu Dicek</span>}
                    </p>
                    <p className="text-xs text-brand-gray-mid">Supplier: {o.supplier_name} Â· {o.items.length} item Â· {formatCurrency(o.total_amount)}</p>
                    <p className="text-[10px] text-brand-gray-light">{formatDate(o.created_at)}</p>
                  </div>
                  {o.status === "AWAITING_SALES" && (role === "SALES" && o.sales_id === myId) && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="secondary" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => rejectOrder(o)}>
                        Tolak
                      </Button>
                      <Button size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => acceptOrder(o)}>
                        Terima
                      </Button>
                    </div>
                  )}
                  {o.status !== "AWAITING_SALES" && (
                    <span className="text-xs font-bold text-brand-gray-mid shrink-0">{o.status.replace(/_/g, " ")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi buat invoice */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Konfirmasi Invoice"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button onClick={createInvoice}>Ya, Buat Invoice</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p>
            <strong>{selectedCust?.store_name}</strong> Â· {selectedCust?.payment_term_label}
          </p>
          <div className="bg-brand-bg rounded-xl p-3 text-xs space-y-1">
            {lineItems
              .filter((li) => li.productId && li.qty > 0)
              .map((li, i) => {
                const p = productOf(li.productId);
                return p ? (
                  <div key={i} className="flex justify-between">
                    <span>{p.name} Ã— {li.qty}</span>
                    <span className="font-semibold">{formatCurrency(priceFor(p, selectedTerm) * li.qty)}</span>
                  </div>
                ) : null;
              })}
            <div className="flex justify-between font-bold text-brand-black pt-0.5">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <p className="text-[10px] text-brand-gray-light">
            Invoice akan masuk alur persetujuan ({role === "SALES" ? "ke Admin Penjualan" : "ke Super Admin"}).
          </p>
        </div>
      </Modal>

      {/* Konfirmasi approve */}
      <Modal
        open={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        title="Konfirmasi Persetujuan"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveConfirmOpen(false)}>Batal</Button>
            <Button onClick={confirmApprove}>Ya, Sudah Sesuai</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p>
            <strong>{role === "SALES_ADMIN" ? "Sudah sesuai?" : "Yakin menyetujui?"}</strong> â€”{" "}
            {curInvoice?.invoice_number}
          </p>
          <p className="text-xs text-brand-gray-mid">
            Setelah disetujui, invoice akan diteruskan ke{" "}
            {role === "SALES_ADMIN"
              ? reviewUnchanged
                ? "Admin Pengiriman langsung, tanpa persetujuan Super Admin."
                : "Super Admin untuk validasi perubahan."
              : "Admin Pengiriman untuk atur tanggal & retur."}
          </p>
        </div>
      </Modal>

      {/* Modal Buat Retur */}
      <Modal
        open={returOpen}
        onClose={() => setReturOpen(false)}
        title="Buat Invoice Retur"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturOpen(false)}>Batal</Button>
            <Button onClick={createRetur}>Buat Retur</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p>
            Merujuk <strong>{curInvoice?.invoice_number}</strong> â€” {formatCurrency(curInvoice?.total ?? 0)}
          </p>
          <Textarea
            label="Alasan Retur"
            placeholder="Contoh: barang rusak / kuantitas tidak sesuai"
            value={returReason}
            onChange={(e) => setReturReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

function roleLabel(role: Role) {
  switch (role) {
    case "SALES_ADMIN":
      return "Persetujuan Anda (Sales Admin)";
    case "SUPER_ADMIN":
      return "Validasi Anda (Super Admin)";
    case "SHIPPING_ADMIN":
      return "Pengiriman Anda (Admin Pengiriman)";
    case "FINANCE":
      return "Pemrosesan Anda (Finance)";
    default:
      return role.replace(/_/g, " ");
  }
}

function PipelineTracker({ status }: { status: string }) {
  const current = pipelineIndex(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {PIPELINE.map((step, i) => {
        const state = current === -1 ? "muted" : i < current ? "done" : i === current ? "active" : "pending";
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs " +
                  (state === "done"
                    ? "bg-green-500 text-white"
                    : state === "active"
                    ? "bg-brand-yellow text-brand-black"
                    : "bg-gray-200 text-gray-400")
                }
              >
                {step.icon === "file" ? "1" : step.icon === "super" ? "2" : step.icon === "ship" ? "3" : step.icon === "fin" ? "4" : "âœ“"}
              </div>
              <span className="text-[8px] text-brand-gray-light whitespace-nowrap">{step.label}</span>
            </div>
            {i < PIPELINE.length - 1 && (
              <span className={current === -1 ? "w-4 h-px bg-gray-200 mt-[-10px]" : i < current ? "w-4 h-px bg-green-400 mt-[-10px]" : "w-4 h-px bg-gray-200 mt-[-10px]"} />
            )}
          </div>
        );
      })}
    </div>
  );
}
