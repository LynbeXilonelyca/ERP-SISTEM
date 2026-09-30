"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";
import { useData } from "@/lib/store";
import { TrendingUp, Banknote, Clock, FileText, Download } from "lucide-react";

export default function SalesReportsPage() {
  const { invoices, payments, customers } = useData();
  const [status, setStatus] = useState("ALL");

  const withPaid = invoices.map((inv) => {
    const paid = payments.filter((p) => p.invoice_id === inv.id).reduce((a, p) => a + (p.amount || 0), 0);
    return { ...inv, paid, outstanding: Math.max(0, inv.total - paid) };
  });

  const filtered = withPaid.filter((i) => status === "ALL" || i.invoice_status === status);
  const revenue = withPaid.filter((i) => i.invoice_status !== "CANCELLED").reduce((s, i) => s + i.total, 0);
  const paid = withPaid.reduce((s, i) => s + i.paid, 0);
  const outstanding = Math.max(0, revenue - paid);

  const income = withPaid
    .filter((i) => i.invoice_status !== "CANCELLED")
    .reduce<Record<string, number>>((acc, i) => {
      acc[i.sales_name] = (acc[i.sales_name] ?? 0) + i.total;
      return acc;
    }, {});

  const ranking = Object.entries(income)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const maxRank = Math.max(1, ...ranking.map((r) => r.total));

  const doExport = () => {
    const rows = filtered.map((i) => ({
      Invoice: i.invoice_number,
      Customer: customers.find((c) => c.id === i.customer_id)?.store_name ?? i.store_name,
      Sales: i.sales_name,
      Tanggal: formatDate(i.created_at),
      Status: i.invoice_status,
      Total: i.total,
      Dibayar: i.paid,
      Sisa: i.outstanding,
    }));
    downloadCSV(rows, "sales-report.csv");
  };

  const columns = [
    {
      key: "invoice_number",
      label: "Invoice",
      render: (_: unknown, row: (typeof withPaid)[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.invoice_number}</p>
          <p className="text-[10px] text-brand-gray-light">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    { key: "store_name", label: "Customer", render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span> },
    { key: "total", label: "Total", render: (v: unknown) => <span className="text-xs font-bold text-brand-black">{formatCurrency(Number(v))}</span> },
    { key: "paid", label: "Dibayar", render: (v: unknown) => <span className="text-xs text-green-600">{formatCurrency(Number(v))}</span> },
    {
      key: "outstanding",
      label: "Sisa",
      render: (_: unknown, row: (typeof withPaid)[0]) => (
        <span className="text-xs text-orange-600">{formatCurrency(row.outstanding)}</span>
      ),
    },
    { key: "invoice_status", label: "Status", render: (v: unknown) => <InvoiceStatusBadge status={String(v)} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Report"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Sales" }, { label: "Reports" }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(revenue)} icon={<TrendingUp className="w-4 h-4" />} accent />
        <StatCard title="Total Dibayar" value={formatCurrency(paid)} icon={<Banknote className="w-4 h-4" />} />
        <StatCard title="Outstanding" value={formatCurrency(outstanding)} icon={<Clock className="w-4 h-4" />} />
        <StatCard title="Invoice Aktif" value={String(withPaid.filter((i) => i.invoice_status !== "CANCELLED").length)} icon={<FileText className="w-4 h-4" />} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">Ranking Penjualan</p>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={doExport} size="sm">Export CSV</Button>
        </div>
        <div className="space-y-3">
          {ranking.length === 0 && <p className="text-sm text-brand-gray-light">Belum ada data penjualan.</p>}
          {ranking.map((r, idx) => (
            <div key={r.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-brand-black">{idx + 1}. {r.name}</span>
                <span className="text-brand-gray-mid">{formatCurrency(r.total)}</span>
              </div>
              <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
                <div className="h-full bg-brand-yellow rounded-full" style={{ width: `${(r.total / maxRank) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-brand-gray-border">
          <select className="form-input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="READY_TO_SHIP">Ready to Ship</option>
            <option value="SENDING">Sending</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} invoice</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered as Record<string, unknown>[]}
          rowKey="id"
        />
      </div>
    </div>
  );
}
