"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { InvoiceStatusBadge, PaymentStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { Eye } from "lucide-react";
import type { Invoice } from "@/types";

const IN_PROGRESS_STATUSES = [
  "PENDING_SUPER",
  "PENDING_SHIPPING",
  "PENDING_FINANCE",
  "CONFIRMED",
  "PRINTED",
  "READY_TO_SHIP",
  "SENDING",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_SUPER", label: "Pending Super" },
  { value: "PENDING_SHIPPING", label: "Pending Shipping" },
  { value: "PENDING_FINANCE", label: "Pending Finance" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PRINTED", label: "Printed" },
  { value: "READY_TO_SHIP", label: "Ready to Ship" },
  { value: "SENDING", label: "Sending" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "RETURNED", label: "Returned" },
];

const PAYMENT_OPTIONS = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

export default function InvoicesPage() {
  const { invoices } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      invoices
        .filter((inv) => {
          const matchSearch =
            !search ||
            inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
            inv.store_name.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer_name.toLowerCase().includes(search.toLowerCase());
          const matchStatus = !statusFilter || inv.invoice_status === statusFilter;
          const matchPayment = !paymentFilter || inv.payment_status === paymentFilter;
          return matchSearch && matchStatus && matchPayment;
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [invoices, search, statusFilter, paymentFilter]
  );

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalValue = invoices.reduce((a, inv) => a + inv.total, 0);

  const detailInvoice = detail ? invoices.find((inv) => inv.id === detail) ?? null : null;

  const columns = [
    {
      key: "invoice_number",
      label: "Invoice",
      render: (_: unknown, row: Invoice) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.invoice_number}</p>
          <p className="text-[10px] text-brand-gray-light">{row.store_name}</p>
        </div>
      ),
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (_: unknown, row: Invoice) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.store_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.customer_name}</p>
        </div>
      ),
    },
    {
      key: "sales_name",
      label: "Sales",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "created_at",
      label: "Tanggal",
      render: (v: unknown) => <span className="text-xs text-brand-gray-mid">{formatDate(String(v))}</span>,
    },
    {
      key: "total",
      label: "Total",
      render: (v: unknown) => <span className="text-xs font-bold text-brand-black">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "payment_status",
      label: "Pembayaran",
      render: (v: unknown) => <PaymentStatusBadge status={String(v)} />,
    },
    {
      key: "invoice_status",
      label: "Status",
      render: (v: unknown) => <InvoiceStatusBadge status={String(v)} />,
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: Invoice) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetail(row.id)}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-brand-gray-mid hover:text-blue-600 transition-colors"
            title="Lihat Detail"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Sales" }, { label: "Invoices" }]}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Invoice", value: String(invoices.length), color: "bg-brand-bg" },
          { label: "Delivered", value: String(invoices.filter((i) => i.invoice_status === "DELIVERED").length), color: "bg-green-50" },
          { label: "Dalam Proses", value: String(invoices.filter((i) => IN_PROGRESS_STATUSES.includes(i.invoice_status)).length), color: "bg-blue-50" },
          { label: "Total Nilai", value: formatCurrency(totalValue), color: "bg-brand-yellow/10" },
        ].map((s) => (
          <div key={s.label} className={`card py-3 ${s.color}`}>
            <p className="text-xl font-bold text-brand-black">{s.value}</p>
            <p className="text-xs text-brand-gray-mid mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari invoice / customer / sales..." className="w-64" />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS}
            placeholder="Semua Status"
            className="w-44"
          />
          <Select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            options={PAYMENT_OPTIONS}
            placeholder="Semua Payment"
            className="w-36"
          />
          {(search || statusFilter || paymentFilter) && (
            <button className="text-xs text-brand-gray-mid hover:text-brand-black" onClick={() => { setSearch(""); setStatusFilter(""); setPaymentFilter(""); setPage(1); }}>
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">
            {filtered.length} invoice Â· {formatCurrency(filtered.reduce((a, inv) => a + inv.total, 0))}
          </span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={paginated as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
        {filtered.length > perPage && (
          <div className="p-4 border-t border-brand-gray-border">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filtered.length / perPage)}
              total={filtered.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modal Detail Invoice */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Detail Invoice â€” ${detailInvoice?.invoice_number ?? ""}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Tutup
          </Button>
        }
      >
        {detailInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-xs text-brand-gray-mid">Customer</p>
                <p className="text-sm font-bold text-brand-black">{detailInvoice.store_name}</p>
                <p className="text-[10px] text-brand-gray-light">{detailInvoice.customer_name}</p>
              </div>
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-xs text-brand-gray-mid">Sales</p>
                <p className="text-sm font-bold text-brand-black">{detailInvoice.sales_name}</p>
              </div>
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-xs text-brand-gray-mid">Tanggal</p>
                <p className="text-sm font-bold text-brand-black">{formatDate(detailInvoice.created_at)}</p>
              </div>
              <div className="p-3 bg-brand-yellow/10 rounded-xl">
                <p className="text-xs text-brand-gray-mid">Total</p>
                <p className="text-sm font-bold text-brand-black">{formatCurrency(detailInvoice.total)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-brand-gray-border">
                    <th className="table-head text-left py-2 px-3">Produk</th>
                    <th className="table-head text-right py-2 px-3">Qty</th>
                    <th className="table-head text-right py-2 px-3">Harga</th>
                    <th className="table-head text-right py-2 px-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailInvoice.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-xs text-brand-gray-light">
                        Tidak ada item.
                      </td>
                    </tr>
                  )}
                  {detailInvoice.items.map((it) => (
                    <tr key={it.id} className="border-b border-brand-gray-border last:border-0">
                      <td className="py-2 px-3 text-xs font-semibold text-brand-black">{it.product_name}</td>
                      <td className="py-2 px-3 text-xs text-right">{it.quantity}</td>
                      <td className="py-2 px-3 text-xs text-right">{formatCurrency(it.selling_price)}</td>
                      <td className="py-2 px-3 text-xs font-bold text-right">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-xs">
                <div className="flex justify-between text-brand-gray-mid">
                  <span>Subtotal</span>
                  <span>{formatCurrency(detailInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-brand-gray-mid">
                  <span>Diskon</span>
                  <span>-{formatCurrency(detailInvoice.discount)}</span>
                </div>
                <div className="flex justify-between font-bold text-brand-black text-sm pt-1 border-t border-brand-gray-border">
                  <span>Total</span>
                  <span>{formatCurrency(detailInvoice.total)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-brand-gray-mid">Status</span>
                  <InvoiceStatusBadge status={detailInvoice.invoice_status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-gray-mid">Pembayaran</span>
                  <PaymentStatusBadge status={detailInvoice.payment_status} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
