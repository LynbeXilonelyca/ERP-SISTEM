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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
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
    inventory,
    setDB,
    notify,
    addAudit,
  } = useData();

  // --- Real metrics ---
  const countable = (i: (typeof invoices)[number]) =>
    i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED";

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const monthRevenue = useMemo(
    () =>
      invoices
        .filter((i) => countable(i) && i.created_at.slice(0, 7) === currentMonthKey)
        .reduce((a, i) => a + i.total, 0),
    [invoices, currentMonthKey]
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
    sessions.filter((s) => s.status === "SUBMITTED" || s.status === "REVIEWED").length;

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

  // Revenue 12 bulan terakhir per bulan (tagihan + terkumpul)
  const monthlyChart = useMemo(() => {
    const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short" });
    const out: { bulan: string; revenue: number; collected: number; invoices: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const list = invoices.filter((inv) => countable(inv) && inv.created_at.slice(0, 7) === key);
      out.push({
        bulan: monthFmt.format(d),
        revenue: list.reduce((a, inv) => a + inv.total, 0),
        collected: list.reduce((a, inv) => a + Math.min(inv.total, paidMap.get(inv.id) ?? 0), 0),
        invoices: list.length,
      });
    }
    return out;
  }, [invoices, paidMap]);

  // Komposisi outstanding: per sales atau per customer
  const [outstandingBy, setOutstandingBy] = useState<"sales" | "customer">("sales");
  const outstandingChart = useMemo(() => {
    const m = new Map<string, number>();
    invoices
      .filter(countable)
      .forEach((inv) => {
        const unpaid = Math.max(0, inv.total - (paidMap.get(inv.id) ?? 0));
        if (unpaid <= 0) return;
        const key =
          outstandingBy === "sales"
            ? inv.sales_name || "Tanpa Sales"
            : inv.store_name || inv.customer_name;
        m.set(key, (m.get(key) ?? 0) + unpaid);
      });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [invoices, paidMap, outstandingBy]);

  const PIE_COLORS = ["#feda00", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#f97316", "#14b8a6", "#ec4899"];
  const monthlyTotal = monthlyChart.reduce((a, m) => a + m.revenue, 0);

  // --- Reminder H-1 (berbasis teks) ---
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
        .filter((i) => countable(i) && i.payment_status !== "PAID" && !!i.due_date)
        .forEach((i) => {
          const due = new Date(`${i.due_date}T23:59:59`).getTime();
          if (due < now && now - due <= dayMs)
            list.push({ text: `H-1 cut off: ${i.invoice_number} (${i.store_name}) melewati jatuh tempo`, tone: "danger", icon: <AlertTriangle className="w-3 h-3" /> });
        });
    }
    sessions
      .filter((s) => s.status === "SUBMITTED" || s.status === "REVIEWED")
      .forEach((s) => list.push({ text: `Sesi ${s.session_code} ${s.sales_name} menunggu pembuktian penagihan`, tone: "info", icon: <Bell className="w-3 h-3" /> }));
    return list;
  }, [settings, invoices, purchases, orders, sessions]);

  const cutsOff = useMemo(
    () => customers.filter((c) => isCustomerCutOff(c.id, invoices, settings)),
    [customers, invoices, settings]
  );

  // --- Form customer baru ---
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

  // --- Pengaturan (komisi, cut off, reminder) ---
  const [form, setForm] = useState({ ...settings });

  const saveSettings = () => {
    setDB((db) => ({ ...db, settings: { ...form } }));
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

      {/* --- Stats ringkasan (real) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
{ringkasan.map((s) => (
          <StatCard key={s.label} title={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </div>

      {/* --- Aksi Cepat (terpisah) --- */}
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

      {/* --- Pusat Pengaturan --- */}
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
              <Input label="Merek Sendiri (%)" type="number" value={String(form.own_brand_commission_rate)} onChange={(e) => setForm({ ...form, own_brand_commission_rate: Number(e.target.value) })} />
              <Input label="Merek Lain (%)" type="number" value={String(form.other_brand_commission_rate)} onChange={(e) => setForm({ ...form, other_brand_commission_rate: Number(e.target.value) })} />
              <Input label="Threshold Cair (%)" type="number" value={String(form.commission_threshold_pct)} onChange={(e) => setForm({ ...form, commission_threshold_pct: Number(e.target.value) })} />
              <div className="flex items-center gap-3 p-3 bg-brand-bg rounded-xl">
                <div className="flex-1">
                  <label className="form-label">Bonus Capaian 100% (Rp)</label>
                  <input type="number" className="form-input" value={String(form.bonus_amount)} onChange={(e) => setForm({ ...form, bonus_amount: Number(e.target.value) })} />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-brand-gray-dark cursor-pointer pt-5">
                  <input type="checkbox" checked={!!form.bonus_enabled} onChange={(e) => setForm({ ...form, bonus_enabled: e.target.checked })} className="w-4 h-4 accent-brand-yellow" />
                  Aktif
                </label>
              </div>
            </div>
          </div>

          {/* Jatuh tempo komisi */}
          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Jatuh Tempo Komisi
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  "Januari",
                  "Februari",
                  "Maret",
                  "April",
                  "Mei",
                  "Juni",
                  "Juli",
                  "Agustus",
                  "September",
                  "Oktober",
                  "November",
                  "Desember",
                ].map((m, i) => (
                  <Input
                    key={m}
                    label={m}
                    type="number"
                    min={1}
                    max={31}
                    value={String(form.commission_due_days?.[i] ?? 25)}
                    onChange={(e) => {
                      const days = [...(form.commission_due_days ?? [])];
                      days[i] = Number(e.target.value);
                      setForm({ ...form, commission_due_days: days });
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-brand-gray-light">
                Atur tanggal jatuh tempo komisi untuk tiap bulan. Lewat tanggal tsb, penagihan yang telat dibayar otomatis dibatasi (komisi distop sesuai kebijakan).
              </p>
            </div>
          </div>

          {/* Cut off & reminder */}
          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Cut Off & Reminder
            </p>
            <div className="space-y-3">
              <p className="text-[10px] text-brand-gray-light -mt-1">
                Cut off otomatis: pelanggan diblokir jika ada invoice belum lunas yang melewati jatuh tempunya.
              </p>
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

      {/* --- Reminder H-1 --- */}
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

      {/* --- Revenue 12 bulan + komposisi outstanding --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <p className="section-title">Revenue 12 Bulan Terakhir</p>
            <span className="text-xs text-brand-gray-light">
              Total {formatCurrency(monthlyTotal)}
            </span>
          </div>
          <p className="text-[10px] text-brand-gray-light mb-3">
            Tagihan (kuning) vs pembayaran terkumpul (hijau) per bulan.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChart} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000000}jt`} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  formatCurrency(v),
                  name === "revenue" ? "Tagihan" : name === "collected" ? "Terkumpul" : "Invoice",
                ]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e0e0e0", fontSize: 12 }}
              />
              <Legend
                formatter={(v: string) => (v === "revenue" ? "Tagihan" : v === "collected" ? "Terkumpul" : "Invoice")}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="revenue" fill="#feda00" radius={[6, 6, 0, 0]} maxBarSize={22} />
              <Bar dataKey="collected" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="section-title">Komposisi Outstanding</p>
            <div className="flex items-center gap-1 bg-brand-bg rounded-lg p-0.5">
              {(["sales", "customer"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setOutstandingBy(k)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold transition-colors",
                    outstandingBy === k ? "bg-brand-yellow text-brand-black" : "text-brand-gray-mid"
                  )}
                >
                  {k === "sales" ? "Per Sales" : "Per Customer"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-brand-gray-light mb-3">
            Total {formatCurrency(outstandingChart.reduce((a, x) => a + x.value, 0))}
          </p>
          {outstandingChart.length === 0 ? (
            <p className="text-sm text-brand-gray-light py-10 text-center">Tidak ada piutang. Semua lunas.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={outstandingChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {outstandingChart.map((x, i) => (
                      <Cell key={x.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e0e0e0", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {outstandingChart.map((x, i) => (
                  <div key={x.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-brand-gray-dark font-semibold">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{x.name}</span>
                    </span>
                    <span className="font-bold text-brand-black flex-shrink-0 ml-2">{formatCurrency(x.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Revenue 7 hari + low stock --- */}
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

      {/* --- Cut off + Orderan + Invoice terbaru --- */}
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

      {/* --- Modal Input Customer --- */}
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