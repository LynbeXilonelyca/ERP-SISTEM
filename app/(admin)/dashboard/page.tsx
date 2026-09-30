"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, InvoiceStatusBadge, PaymentStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { cn, formatCurrency, isCustomerCutOff } from "@/lib/utils";
import { useData } from "@/lib/store";
import { paymentTerms } from "@/lib/seed";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Clock,
  Bell,
  ClipboardCheck,
  ShoppingCart,
  Truck,
  BadgeDollarSign,
  Settings,
  CircleDollarSign,
  CheckCircle,
  Zap,
  UserPlus,
  PackagePlus,
  Boxes,
} from "lucide-react";
import type { CustomerType } from "@/types";

export default function DashboardPage() {
  const {
    users,
    products,
    brands,
    customers,
    invoices,
    sessions,
    purchases,
    orders,
    settings,
    payments,
    price_change_requests,
    billing_sessions,
    inventory,
    setDB,
    notify,
    addAudit,
  } = useData();

  // ── Real metrics ─────────────────────────────────────────────
  const countable = (i: (typeof invoices)[number]) =>
    i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED";

  const monthRevenue = useMemo(
    () =>
      invoices
        .filter((i) => countable(i) && i.created_at.slice(0, 7) === "2026-09")
        .reduce((a, i) => a + i.total, 0),
    [invoices]
  );

  const paidMap = useMemo(() => {
    const m = new Map<string, number>();
    payments.forEach((p) => m.set(p.invoice_id, (m.get(p.invoice_id) ?? 0) + (p.amount ?? 0)));
    return m;
  }, [payments]);

  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => countable(i))
        .reduce((a, i) => a + Math.max(0, i.total - (paidMap.get(i.id) ?? 0)), 0),
    [invoices, paidMap]
  );

  const lowStock = useMemo(
    () =>
      inventory
        .map((inv) => {
          const p = products.find((x) => x.id === inv.product_id);
          const avail = (inv.physical_stock ?? 0) - (inv.reserved_stock ?? 0) - (inv.damaged_stock ?? 0);
          return { p, avail, warning: p?.warning_stock ?? 20 };
        })
        .filter((x) => x.p && x.avail <= x.warning),
    [inventory, products]
  );

  const pendingCount =
    invoices.filter((i) => i.invoice_status === "PENDING_SUPER").length +
    purchases.filter((p) => p.status === "SUBMITTED").length +
    price_change_requests.filter((r) => r.status === "PENDING").length +
    sessions.filter((s) => s.status === "PENDING_REVIEW").length +
    billing_sessions.filter((b) => b.status === "PENDING" || b.status === "REVIEWED").length;

  // Revenue 7 hari terakhir (jalur data nyata)
  const revenueChart = useMemo(() => {
    const days: { day: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const list = invoices.filter((inv) => countable(inv) && inv.created_at.slice(0, 10) === key);
      days.push({
        day: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(d),
        revenue: list.reduce((a, inv) => a + inv.total, 0),
        orders: list.length,
      });
    }
    return days;
  }, [invoices]);

  // ── Reminder H-1 (berbasis teks) ─────────────────────────────
  const reminders = useMemo(() => {
    const list: { text: string; tone: "warn" | "danger" | "info"; icon: React.ReactNode }[] = [];
    if (!settings.reminder_h1_enabled) return list;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    invoices
      .filter((i) => i.invoice_status === "PENDING_SUPER")
      .forEach((i) => {
        const age = Math.floor((now - new Date(i.created_at).getTime()) / dayMs);
        if (age >= 1) list.push({ text: `${i.invoice_number} menunggu approval sejak ${age} hari`, tone: "warn", icon: <Clock className="w-3 h-3" /> });
      });
    purchases
      .filter((p) => p.status === "SUBMITTED")
      .forEach((p) => {
        const age = Math.floor((now - new Date(p.created_at).getTime()) / dayMs);
        if (age >= 1) list.push({ text: `${p.purchase_code} (${p.supplier_name}) belum disetujui`, tone: "warn", icon: <ShoppingCart className="w-3 h-3" /> });
      });
    orders
      .filter((o) => o.status === "AWAITING_SALES")
      .forEach((o) => {
        const age = Math.floor((now - new Date(o.created_at).getTime()) / dayMs);
        if (age >= 1) list.push({ text: `Order ${o.order_code} belum dicek ${o.sales_name}`, tone: "warn", icon: <Truck className="w-3 h-3" /> });
      });
    if (settings.cut_off_enabled) {
      invoices
        .filter((i) => countable(i) && i.payment_status !== "PAID")
        .forEach((i) => {
          const age = Math.floor((now - new Date(i.created_at).getTime()) / dayMs);
          if (age === settings.cut_off_days - 1)
            list.push({ text: `H-1 cut off: ${i.invoice_number} (${i.store_name}) akan diblokir besok`, tone: "danger", icon: <AlertTriangle className="w-3 h-3" /> });
        });
    }
    sessions
      .filter((s) => s.status === "PENDING_REVIEW")
      .forEach((s) => list.push({ text: `Sesi ${s.session_code} ${s.sales_name} menunggu tutup bulan`, tone: "info", icon: <Bell className="w-3 h-3" /> }));
    return list;
  }, [settings, invoices, purchases, orders, sessions]);

  const cutsOff = useMemo(
    () => customers.filter((c) => isCustomerCutOff(c.id, invoices, settings)),
    [customers, invoices, settings]
  );

  // ── Form customer baru ───────────────────────────────────────
  const [showCustomer, setShowCustomer] = useState(false);
  const [custForm, setCustForm] = useState({
    store_name: "",
    owner_name: "",
    sales_id: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    customer_type: "REGULAR" as CustomerType,
    payment_term_id: "pt7",
  });

  const salesUsers = users.filter((u) => u.role === "SALES" && u.status === "ACTIVE");

  const addCustomer = () => {
    if (!custForm.store_name || !custForm.sales_id) return;
    const sales = salesUsers.find((s) => s.id === custForm.sales_id);
    const term = paymentTerms.find((t) => t.id === custForm.payment_term_id);
    setDB((db) => ({
      ...db,
      customers: [
        ...db.customers,
        {
          id: `cu${Date.now()}`,
          customer_code: `CST-${String(db.customers.length + 1).padStart(3, "0")}`,
          store_name: custForm.store_name,
          owner_name: custForm.owner_name || custForm.store_name,
          sales_id: sales?.id ?? "",
          sales_name: sales?.name ?? "",
          phone: custForm.phone,
          email: custForm.email,
          address: custForm.address,
          city: custForm.city,
          customer_type: custForm.customer_type,
          payment_term_id: term?.id ?? custForm.payment_term_id,
          payment_term_label: term?.label ?? "1 Minggu",
          credit_limit: 0,
          outstanding: 0,
          minimum_order: 1,
          maximum_order: 500,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
        },
      ],
    }));
    addAudit({ user_name: "Super Admin", user_role: "SUPER_ADMIN", action: "CREATE", module: "CUSTOMER", record_id: custForm.store_name, old_value: "NONE", new_value: "ACTIVE", ip_address: "local", device: "Web" });
    notify({ title: "Customer Ditambahkan", message: `${custForm.store_name} untuk ${sales?.name ?? "-"} tersimpan.`, type: "SUCCESS" });
    setShowCustomer(false);
    setCustForm({ store_name: "", owner_name: "", sales_id: "", phone: "", email: "", address: "", city: "", customer_type: "REGULAR", payment_term_id: "pt7" });
  };

  // ── Pengaturan (komisi, cut off, reminder) ───────────────────
  const [form, setForm] = useState({ ...settings });

  const saveSettings = () => {
    setDB((db) => ({ ...db, settings: { ...form, cut_off_days: Math.max(1, Number(form.cut_off_days) || 30) } }));
    notify({ title: "Pengaturan Disimpan", message: "Komisi, cut off, dan reminder diperbarui.", type: "SUCCESS" });
  };

  const toggleBrandOwn = (brandId: string, val: boolean) => {
    setDB((db) => ({
      ...db,
      products: db.products.map((p) => (p.brand_id === brandId ? { ...p, is_own_brand: val } : p)),
    }));
    notify({ title: "Merek Diperbarui", message: `Produk merek ${brands.find((b) => b.id === brandId)?.name ?? ""} ${val ? "ditandai Merek Sendiri" : "ditandai Merek Lain"}.`, type: "SUCCESS" });
  };

  const recentInvoices = [...invoices].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);

  const ringkasan: { label: string; value: string; icon: React.ReactNode; accent?: boolean }[] = [
    { label: "Revenue Bulan Ini", value: formatCurrency(monthRevenue), icon: <TrendingUp className="w-4 h-4" />, accent: true },
    { label: "Outstanding", value: formatCurrency(outstanding), icon: <CircleDollarSign className="w-4 h-4" /> },
    { label: "Low Stock", value: String(lowStock.length), icon: <AlertTriangle className="w-4 h-4" /> },
    { label: "Pending Approval", value: String(pendingCount), icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        breadcrumbs={[{ label: "Home" }, { label: "Dashboard" }]}
      />

      {/* ── Stats ringkasan (real) ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
{ringkasan.map((s) => (
          <StatCard key={s.label} title={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </div>

      {/* ── Aksi Cepat (terpisah) ──────────────────────────── */}
      <div className="card">
        <p className="section-title mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Aksi Cepat
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setShowCustomer(true)}
            className="flex items-center gap-3 p-3 rounded-xl bg-brand-yellow text-brand-black font-bold shadow-sm hover:shadow transition-shadow"
          >
            <UserPlus className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold">Tambah Customer</span>
          </button>
          <Link
            href="/products?new=1"
            className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg text-brand-gray-dark hover:bg-brand-bg/70 transition-colors"
          >
            <PackagePlus className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">Tambah Produk</span>
          </Link>
          <Link
            href="/inventory"
            className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg text-brand-gray-dark hover:bg-brand-bg/70 transition-colors"
          >
            <Boxes className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">Update Stok</span>
          </Link>
          <Link
            href="/approvals"
            className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg text-brand-gray-dark hover:bg-brand-bg/70 transition-colors"
          >
            <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">Approval</span>
          </Link>
        </div>
      </div>

      {/* ── Pusat Pengaturan ──────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title flex items-center gap-2"><Settings className="w-4 h-4" /> Pusat Pengaturan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Komisi */}
          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BadgeDollarSign className="w-3.5 h-3.5" /> Komisi
            </p>
            <div className="space-y-3">
              <Input label="Komisi Utama" type="number" value={String(form.main_commission_rate ?? 5)} onChange={(e) => setForm({ ...form, main_commission_rate: Number(e.target.value) })} />
              <Input label="Merek Sendiri" type="number" value={String(form.own_brand_commission_rate ?? 5)} onChange={(e) => setForm({ ...form, own_brand_commission_rate: Number(e.target.value) })} />
              <Input label="Merek Lain" type="number" value={String(form.other_brand_commission_rate ?? 3)} onChange={(e) => setForm({ ...form, other_brand_commission_rate: Number(e.target.value) })} />
            </div>
          </div>

          {/* Cut off & reminder */}
          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Cut Off & Reminder
            </p>
            <div className="space-y-3">
              <Input label="Tenggat Piutang (hari)" type="number" value={String(form.cut_off_days ?? 30)} onChange={(e) => setForm({ ...form, cut_off_days: Number(e.target.value) })} />
              <label className="flex items-center justify-between p-3 bg-brand-bg rounded-xl cursor-pointer">
                <span className="text-xs font-semibold text-brand-gray-dark">Aktifkan Cut Off</span>
                <input type="checkbox" checked={!!form.cut_off_enabled} onChange={(e) => setForm({ ...form, cut_off_enabled: e.target.checked })} className="w-4 h-4 accent-brand-yellow" />
              </label>
              <label className="flex items-center justify-between p-3 bg-brand-bg rounded-xl cursor-pointer">
                <span className="text-xs font-semibold text-brand-gray-dark">Reminder H-1</span>
                <input type="checkbox" checked={!!form.reminder_h1_enabled} onChange={(e) => setForm({ ...form, reminder_h1_enabled: e.target.checked })} className="w-4 h-4 accent-brand-yellow" />
              </label>
            </div>
          </div>

          {/* Merek sendiri / luar */}
          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Merek Sendiri & Merek Lain
            </p>
            <div className="space-y-2">
              {brands.map((b) => {
                const prodList = products.filter((p) => p.brand_id === b.id);
                const own = prodList.every((p) => p.is_own_brand);
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-brand-black">{b.name}</p>
                      <p className="text-[10px] text-brand-gray-light">{prodList.length} produk · {own ? "Merek Sendiri" : "Merek Lain"}</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className={cn("text-[10px] font-bold", own ? "text-green-600" : "text-brand-gray-mid")}>{own ? "Merek Sendiri" : "Merek Lain"}</span>
                      <input type="checkbox" checked={own} onChange={(e) => toggleBrandOwn(b.id, e.target.checked)} className="w-4 h-4 accent-brand-yellow" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button icon={<CheckCircle className="w-4 h-4" />} onClick={saveSettings}>
            Simpan Pengaturan
          </Button>
        </div>
      </div>

      {/* ── Reminder H-1 ───────────────────────────────────── */}
      {reminders.length > 0 && (
        <div className="card">
          <p className="section-title mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Reminder & Alert
            <Badge variant="danger">{reminders.length}</Badge>
          </p>
          <div className="space-y-2">
            {reminders.map((r, i) => (
              <div key={i} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-xs", r.tone === "danger" ? "bg-red-50 text-red-600" : r.tone === "warn" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600")}>
                {r.icon}
                <span className="font-semibold">{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue 7 hari + low stock ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Revenue 7 Hari Terakhir</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#feda00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#feda00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000000}jt`} />
              <Tooltip formatter={(v: number, name: string) => [name === "orders" ? `${v} invoice` : formatCurrency(v), name]} />
              <Area type="monotone" dataKey="revenue" stroke="#feda00" strokeWidth={2.5} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Low Stock</p>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 6).map((x) => (
              <div key={x.p!.id} className="flex items-center justify-between py-1.5 border-b border-brand-gray-border last:border-0">
                <div>
                  <p className="text-xs font-semibold text-brand-black">{x.p!.name}</p>
                  <p className="text-[10px] text-brand-gray-light">{x.p!.sku}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", x.avail <= 5 ? "text-red-500" : "text-orange-500")}>{x.avail} unit</p>
                  <p className="text-[10px] text-brand-gray-light">/ {x.warning}</p>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-sm text-brand-gray-light py-4 text-center">Stok semua produk aman.</p>}
          </div>
        </div>
      </div>

      {/* ── Cut off + Orderan + Invoice terbaru ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="section-title mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Customer Kena Cut Off</p>
          {cutsOff.length === 0 ? (
            <p className="text-xs text-brand-gray-light">Tidak ada customer yang kena cut off. Piutang terkontrol.</p>
          ) : (
            <div className="space-y-2">
              {cutsOff.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-brand-black">{c.store_name}</p>
                    <p className="text-[10px] text-brand-gray-light">{c.sales_name} · piutang {formatCurrency(c.outstanding)}</p>
                  </div>
                  <Badge variant="danger">CUT OFF</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="section-title mb-2 flex items-center gap-2"><Truck className="w-4 h-4" /> Orderan dari Supplier</p>
          <div className="space-y-2">
            {orders.length === 0 && <p className="text-xs text-brand-gray-light">Belum ada orderan. Jalur ini mulai dari Purchase yang disetujui.</p>}
            {[...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-2.5 bg-brand-bg rounded-xl">
                <div>
                  <p className="text-xs font-bold text-brand-black">{o.order_code}</p>
                  <p className="text-[10px] text-brand-gray-light">{o.supplier_name} · {o.sales_name}</p>
                </div>
                <span className={cn("text-[9px] font-bold uppercase px-2 py-1 rounded-md", o.status === "AWAITING_SALES" ? "bg-orange-100 text-orange-600" : o.status === "COMPLETED" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600")}>
                  {o.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Invoice Terbaru</p>
            <a href="/approvals" className="text-xs text-brand-gray-mid hover:text-brand-black transition-colors">Approvals →</a>
          </div>
          <div className="divide-y divide-brand-gray-border">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-brand-black">{inv.invoice_number}</p>
                  <span className="text-xs font-bold text-brand-black">{formatCurrency(inv.total)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-brand-gray-light">{inv.store_name} · {inv.sales_name}</p>
                  <div className="flex items-center gap-1">
                    <InvoiceStatusBadge status={inv.invoice_status} />
                    <PaymentStatusBadge status={inv.payment_status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-brand-gray-light mt-2 text-right">{invoices.length} total invoice</p>
        </div>
      </div>

      {/* ── Modal Input Customer ───────────────────────────── */}
      <Modal
        open={showCustomer}
        onClose={() => setShowCustomer(false)}
        title="Input Customer Baru"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCustomer(false)}>Batal</Button>
            <Button disabled={!custForm.store_name || !custForm.sales_id} onClick={addCustomer}>
              Simpan Customer
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Nama Toko (wajib)" value={custForm.store_name} onChange={(e) => setCustForm({ ...custForm, store_name: e.target.value })} />
          <Input label="Nama Pemilik" value={custForm.owner_name} onChange={(e) => setCustForm({ ...custForm, owner_name: e.target.value })} />
          <Select
            label="Sales PIC (wajib)"
            value={custForm.sales_id}
            onChange={(e) => setCustForm({ ...custForm, sales_id: e.target.value })}
            options={salesUsers.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Pilih sales"
          />
          <Select
            label="Tipe Customer"
            value={custForm.customer_type}
            onChange={(e) => setCustForm({ ...custForm, customer_type: e.target.value as CustomerType })}
            options={[
              { value: "REGULAR", label: "Regular" },
              { value: "RESELLER", label: "Reseller" },
              { value: "DISTRIBUTOR", label: "Distributor" },
            ]}
          />
          <Select
            label="Term Pembayaran"
            value={custForm.payment_term_id}
            onChange={(e) => setCustForm({ ...custForm, payment_term_id: e.target.value })}
            options={paymentTerms.map((t) => ({ value: t.id, label: `${t.label} (${t.days} hari)` }))}
          />
          <Input label="No. HP" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} />
          <Input label="Email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} />
          <Input label="Kota" value={custForm.city} onChange={(e) => setCustForm({ ...custForm, city: e.target.value })} />
          <div className="col-span-2">
            <Textarea label="Alamat" value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} className="min-h-[60px]" />
          </div>
        </div>
      </Modal>
    </div>
  );
}