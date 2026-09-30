"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { PaymentStatusBadge, InvoiceStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Printer, X, ShoppingCart, FilePlus2, CheckCircle2, XCircle } from "lucide-react";
import type { SalesOrder } from "@/types";

function BillContent({ invoice }: { invoice: { invoice_number: string; store_name: string; customer_name: string; sales_name: string; created_at: string; items: { product_name: string; quantity: number; selling_price: number }[]; subtotal: number; discount: number; total: number; payment_term_label: string } }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-brand-gray-border">
      <div className="flex items-start justify-between border-b border-gray-300 pb-4">
        <div>
          <p className="text-xl font-bold text-brand-black">TAGIHAN</p>
          <p className="text-xs text-brand-gray-mid">ERP Sistem Distribusi</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand-black">{invoice.invoice_number}</p>
          <p className="text-xs text-brand-gray-light">{formatDate(invoice.created_at)}</p>
        </div>
      </div>
      <div className="flex justify-between items-end py-4">
        <div>
          <p className="text-[10px] text-brand-gray-light uppercase">Kepada</p>
          <p className="text-sm font-bold text-brand-black">{invoice.customer_name || invoice.store_name}</p>
          <p className="text-xs text-brand-gray-mid">{invoice.store_name}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-brand-gray-light uppercase">Sales</p>
          <p className="text-sm font-bold text-brand-black">{invoice.sales_name}</p>
          <p className="text-xs text-brand-gray-mid">{invoice.payment_term_label}</p>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-2 text-brand-gray-mid">Produk</th>
            <th className="text-right py-2 text-brand-gray-mid">Qty</th>
            <th className="text-right py-2 text-brand-gray-mid">Harga</th>
            <th className="text-right py-2 text-brand-gray-mid">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 font-semibold text-brand-black">{it.product_name}</td>
              <td className="py-2 text-right">{it.quantity}</td>
              <td className="py-2 text-right">{formatCurrency(it.selling_price)}</td>
              <td className="py-2 text-right font-semibold">{formatCurrency(it.selling_price * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mt-4">
        <div className="w-52 space-y-1 text-xs">
          <div className="flex justify-between text-brand-gray-mid">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-brand-gray-mid">
            <span>Diskon</span>
            <span>-{formatCurrency(invoice.discount)}</span>
          </div>
          <div className="flex justify-between font-bold text-brand-black text-sm pt-1 border-t border-gray-300">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { invoices, payments, orders, customers, sessions, settings, setDB, notify, addAudit, recalcSessionTotals } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<"tagihan" | "orderan">("tagihan");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [printInvoice, setPrintInvoice] = useState<string | null>(null);

  // â”€â”€ Orderan (jalur purchase â†’ sales â†’ finance) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === "APPROVED_BY_SALES").sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [orders]
  );
  const orderHistory = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "APPROVED_BY_SALES")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [orders]
  );

  const [orderTarget, setOrderTarget] = useState<SalesOrder | null>(null);
  const [orderCustomerId, setOrderCustomerId] = useState("");
  const [orderPrices, setOrderPrices] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");

  const openOrderInvoice = (o: SalesOrder) => {
    setOrderTarget(o);
    setOrderCustomerId("");
    setOrderPrices(o.items.map((it) => it.cost_price));
    const d = new Date();
    d.setDate(d.getDate() + Math.max(1, settings.cut_off_days));
    setDueDate(d.toISOString().slice(0, 10));
  };

  const orderCustomers = useMemo(() => {
    if (!orderTarget) return [];
    return customers
      .filter((c) => c.sales_id === orderTarget.sales_id && c.status === "ACTIVE")
      .sort((a, b) => a.store_name.localeCompare(b.store_name));
  }, [customers, orderTarget]);

  const orderSubtotal = useMemo(() => {
    if (!orderTarget) return 0;
    return orderTarget.items.reduce((acc, it, i) => acc + (orderPrices[i] ?? 0) * it.quantity, 0);
  }, [orderTarget, orderPrices]);

  const createOrderInvoice = () => {
    if (!orderTarget || !orderCustomerId) return;
    const cust = orderCustomers.find((c) => c.id === orderCustomerId);
    if (!cust) return;
    const sessionId =
      sessions.find((s) => s.sales_id === orderTarget.sales_id && s.status === "ACTIVE")?.id ??
      [...sessions]
        .filter((s) => s.sales_id === orderTarget.sales_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.id ??
      "";
    const items = orderTarget.items.map((it, i) => {
      const price = orderPrices[i] ?? it.cost_price;
      return {
        id: `ii${Date.now()}-${i}`,
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        quantity: it.quantity,
        cost_at_transaction: it.cost_price,
        standard_price: it.cost_price,
        selling_price: price,
        subtotal: price * it.quantity,
        payment_term: cust.payment_term_id,
      };
    });
    const now = new Date();
    const num = `INV-O-${now.getFullYear()}-${String(6000 + invoices.length + 1).padStart(4, "0")}`;
    setDB((db) => ({
      ...db,
      invoices: [
        ...db.invoices,
        {
          id: `inv${Date.now()}`,
          invoice_number: num,
          session_id: sessionId,
          sales_id: orderTarget.sales_id,
          sales_name: orderTarget.sales_name,
          customer_id: cust.id,
          customer_name: cust.store_name,
          store_name: cust.store_name,
          items,
          payment_term_id: cust.payment_term_id,
          payment_term_label: cust.payment_term_label,
          subtotal: orderSubtotal,
          discount: 0,
          total: orderSubtotal,
          invoice_status: "PENDING_SUPER" as const,
          payment_status: "UNPAID" as const,
          shipping_status: "PENDING" as const,
          source: "ORDER" as const,
          order_id: orderTarget.id,
          due_date: dueDate,
          print_count: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ],
      orders: db.orders.map((o) => (o.id === orderTarget.id ? { ...o, status: "INVOICE_PENDING" as const } : o)),
    }));
    if (sessionId) recalcSessionTotals(sessionId);
    addAudit({ user_name: user?.name ?? "Finance", user_role: user?.role ?? "FINANCE", action: "CREATE", module: "INVOICE", record_id: num, old_value: "ORDER_APPROVED", new_value: "PENDING_SUPER", ip_address: "local", device: "Web" });
    notify({ title: "Invoice Order Dibuat", message: `${num} untuk ${cust.store_name} menunggu persetujuan Super Admin.`, type: "SUCCESS", target_role: "SUPER_ADMIN" });
    setOrderTarget(null);
    setOrderCustomerId("");
  };

  const orderStatusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      AWAITING_SALES: { label: "Menunggu Sales", cls: "bg-orange-100 text-orange-600" },
      APPROVED_BY_SALES: { label: "Barang Ada â€” Siap Tagih", cls: "bg-blue-100 text-blue-600" },
      REJECTED_BY_SALES: { label: "Barang Tidak Ada", cls: "bg-red-100 text-red-500" },
      INVOICE_PENDING: { label: "Invoice Menunggu Approval", cls: "bg-purple-100 text-purple-600" },
      COMPLETED: { label: "Selesai", cls: "bg-green-100 text-green-600" },
      CANCELLED: { label: "Dibatalkan", cls: "bg-gray-100 text-brand-gray-mid" },
    };
    const m = map[s] ?? { label: s.replace(/_/g, " "), cls: "bg-brand-bg text-brand-gray-mid" };
    return <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md ${m.cls}`}>{m.label}</span>;
  };

  const billing = invoices
    .filter((inv) => inv.invoice_status === "CONFIRMED" || inv.invoice_status === "DELIVERED")
    .map((inv) => {
      const paid = payments
        .filter((p) => p.invoice_id === inv.id)
        .reduce((a, p) => a + (p.amount || 0), 0);
      const outstanding = Math.max(0, inv.total - paid);
      let status = inv.payment_status;
      if (paid >= inv.total && inv.total > 0) status = "PAID";
      else if (paid > 0) status = "PARTIAL";
      const items =
        inv.items && inv.items.length > 0
          ? inv.items
          : [];
      return { ...inv, paid, outstanding, payment_status: status, items: items.map((it) => ({ product_name: it.product_name, quantity: it.quantity, selling_price: it.selling_price })) };
    });

  const filtered = billing.filter((b) => {
    const matchSearch = !search || b.invoice_number.toLowerCase().includes(search.toLowerCase()) || b.store_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const printTarget = printInvoice ? billing.find((b) => b.id === printInvoice) ?? null : null;

  const columns = [
    {
      key: "invoice_number",
      label: "Invoice",
      render: (_: unknown, row: (typeof billing)[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.invoice_number}</p>
          <p className="text-[10px] text-brand-gray-light">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: "store_name",
      label: "Customer",
      render: (_: unknown, row: (typeof billing)[0]) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.store_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.sales_name}</p>
        </div>
      ),
    },
    { key: "total", label: "Total", render: (v: unknown) => <span className="text-xs font-bold text-brand-black">{formatCurrency(Number(v))}</span> },
    { key: "paid", label: "Terbayar", render: (v: unknown) => <span className="text-xs font-semibold text-green-600">{formatCurrency(Number(v))}</span> },
    {
      key: "outstanding",
      label: "Sisa",
      render: (v: unknown) => (
        <span className={`text-xs font-bold ${Number(v) > 0 ? "text-red-500" : "text-brand-gray-light"}`}>
          {Number(v) > 0 ? formatCurrency(Number(v)) : "â€”"}
        </span>
      ),
    },
    { key: "payment_status", label: "Status", render: (v: unknown) => <PaymentStatusBadge status={String(v)} /> },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: (typeof billing)[0]) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPrintInvoice(row.id)}
            className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors"
            title="Print Tagihan"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const totalOutstanding = billing.reduce((a, b) => a + b.outstanding, 0);
  const forPrint = printTarget
    ? {
        invoice_number: printTarget.invoice_number,
        store_name: printTarget.store_name,
        customer_name: printTarget.customer_name,
        sales_name: printTarget.sales_name,
        created_at: printTarget.created_at,
        items: printTarget.items,
        subtotal: printTarget.subtotal,
        discount: printTarget.discount,
        total: printTarget.total,
        payment_term_label: printTarget.payment_term_label,
      }
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buat & Print Tagihan"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "Buat & Print Tagihan" }]}
      />

      <div className="flex gap-2">
        <button
          onClick={() => setTab("tagihan")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-colors",
            tab === "tagihan" ? "bg-brand-black text-white" : "bg-white text-brand-gray-mid border border-brand-gray-border hover:bg-brand-bg"
          )}
        >
          Tagihan
        </button>
        <button
          onClick={() => setTab("orderan")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-colors",
            tab === "orderan" ? "bg-brand-black text-white" : "bg-white text-brand-gray-mid border border-brand-gray-border hover:bg-brand-bg"
          )}
        >
          Orderan ({readyOrders.length} siap tagih)
        </button>
      </div>

      {tab === "orderan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card py-3">
              <p className="text-2xl font-bold text-blue-600">{readyOrders.length}</p>
              <p className="text-xs text-brand-gray-mid mt-0.5">Siap Dibuatkan Invoice</p>
            </div>
            <div className="card py-3">
              <p className="text-2xl font-bold text-purple-600">{orderHistory.filter((o) => o.status === "INVOICE_PENDING").length}</p>
              <p className="text-xs text-brand-gray-mid mt-0.5">Invoice Menunggu Approval</p>
            </div>
            <div className="card py-3">
              <p className="text-2xl font-bold text-green-600">{orderHistory.filter((o) => o.status === "COMPLETED").length}</p>
              <p className="text-xs text-brand-gray-mid mt-0.5">Orderan Selesai</p>
            </div>
            <div className="card py-3 bg-brand-yellow/10">
              <p className="text-2xl font-bold text-brand-black">{formatCurrency(readyOrders.reduce((a, o) => a + o.total_amount, 0))}</p>
              <p className="text-xs text-brand-gray-mid mt-0.5">Nilai Order Siap</p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-brand-gray-border">
              <p className="section-title">Order Menunggu Invoice</p>
              <p className="text-xs text-brand-gray-light">Sales sudah mengonfirmasi barang tersedia. Buat invoice â†’ Super Admin approve â†’ tercatat di history.</p>
            </div>
            <div className="divide-y divide-brand-gray-border">
              {readyOrders.length === 0 && <p className="p-4 text-sm text-brand-gray-light">Tidak ada order yang siap ditagih.</p>}
              {readyOrders.map((o) => (
                <div key={o.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-bold text-brand-black">{o.order_code}</p>
                    <p className="text-xs text-brand-gray-mid">Supplier: {o.supplier_name} Â· Sales: {o.sales_name}</p>
                  </div>
                  <div className="text-xs text-brand-gray-mid">{o.items.length} item</div>
                  <div className="text-sm font-bold text-brand-black w-32">{formatCurrency(o.total_amount)}</div>
                  <Button size="sm" icon={<FilePlus2 className="w-3.5 h-3.5" />} onClick={() => openOrderInvoice(o)}>
                    Buat Invoice
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {orderHistory.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-brand-gray-border">
                <p className="section-title">Riwayat Orderan</p>
              </div>
              <div className="divide-y divide-brand-gray-border">
                {orderHistory.map((o) => (
                  <div key={o.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-sm font-bold text-brand-black">{o.order_code}</p>
                      <p className="text-xs text-brand-gray-mid">Supplier: {o.supplier_name} Â· {formatDate(o.created_at)}</p>
                    </div>
                    <div className="text-sm font-bold text-brand-black w-32">{formatCurrency(o.total_amount)}</div>
                    {orderStatusBadge(o.status)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Buat Invoice dari Order */}
          <Modal
            open={!!orderTarget}
            onClose={() => setOrderTarget(null)}
            title={orderTarget ? `Buat Invoice â€” ${orderTarget.order_code}` : "Buat Invoice"}
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setOrderTarget(null)}>Batal</Button>
                <Button icon={<FilePlus2 className="w-4 h-4" />} disabled={!orderCustomerId || orderSubtotal <= 0} onClick={createOrderInvoice}>
                  Buat Invoice & Kirim ke Super Admin
                </Button>
              </>
            }
          >
            {orderTarget && (
              <div className="space-y-4">
                <div className="p-3 bg-brand-yellow/10 rounded-xl text-xs text-brand-gray-dark">
                  Invoice dari <strong>{orderTarget.supplier_name}</strong> untuk sales <strong>{orderTarget.sales_name}</strong>.
                  Atur harga jual tiap barang, pilih customer tujuan, lalu kirim ke Super Admin untuk persetujuan.
                </div>
                <Select
                  label="Customer (wajib)"
                  value={orderCustomerId}
                  onChange={(e) => setOrderCustomerId(e.target.value)}
                  options={orderCustomers.map((c) => ({ value: c.id, label: `${c.store_name} (${c.payment_term_label})` }))}
                  placeholder="Pilih customer"
                />
                <div>
                  <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-2">Barang & Harga Jual</p>
                  <div className="space-y-2">
                    {orderTarget.items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-3 p-3 bg-brand-bg rounded-xl items-end">
                        <div className="col-span-6">
                          <p className="text-xs font-semibold text-brand-black">{it.product_name}</p>
                          <p className="text-[10px] text-brand-gray-light">{it.sku} Â· Modal {formatCurrency(it.cost_price)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-bold text-brand-black">Ã— {it.quantity}</p>
                        </div>
                        <div className="col-span-4">
                          <Input
                            label="Harga Jual"
                            type="number"
                            value={String(orderPrices[i] ?? "")}
                            onChange={(e) =>
                              setOrderPrices((prev) => prev.map((v, idx) => (idx === i ? Number(e.target.value) : v)))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Input label="Jatuh Tempo" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="text-right">
                      <p className="text-[10px] text-brand-gray-light uppercase">Total Invoice</p>
                      <p className="text-2xl font-bold text-brand-black">{formatCurrency(orderSubtotal)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {tab === "tagihan" && (
      <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Outstanding</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(billing.reduce((a, b) => a + b.paid, 0))}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Terbayar</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-orange-600">{billing.filter((b) => b.payment_status === "OVERDUE").length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Overdue Invoice</p>
        </div>
        <div className="card py-3 bg-brand-yellow/10">
          <p className="text-2xl font-bold text-brand-black">{billing.length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Invoice Siap Tagih</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari invoice / customer..." className="w-56" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "UNPAID", label: "Unpaid" },
              { value: "PARTIAL", label: "Partial" },
              { value: "PAID", label: "Paid" },
              { value: "OVERDUE", label: "Overdue" },
            ]}
            placeholder="Semua Status"
            className="w-36"
          />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} tagihan</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered as Record<string, unknown>[]}
          rowKey="id"
        />
      </div>

      {/* Modal Print */}
      <Modal
        open={!!printInvoice}
        onClose={() => setPrintInvoice(null)}
        title="Print Tagihan"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPrintInvoice(null)} icon={<X className="w-4 h-4" />}>Tutup</Button>
            <Button
              icon={<Printer className="w-4 h-4" />}
              onClick={() => {
                notify({ title: "Cetak", message: "Gunakan printer Anda untuk mencetak tagihan.", type: "INFO" });
                if (typeof window !== "undefined") window.print();
              }}
            >
              Print
            </Button>
          </>
        }
      >
        {forPrint && <BillContent invoice={forPrint} />}
      </Modal>
      </div>
      )}
    </div>
  );
}
