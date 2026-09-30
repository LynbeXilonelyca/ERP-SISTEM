"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { Download, Printer } from "lucide-react";

export default function SalesReportPage() {
  const { invoices, sessions } = useData();
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const filtered = invoices.filter((i) => {
    const matchSearch =
      !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.store_name.toLowerCase().includes(search.toLowerCase());
    const matchSession = !sessionFilter || i.session_id === sessionFilter;
    return matchSearch && matchSession;
  });

  const totalRevenue = filtered.reduce((a, i) => a + i.total, 0);
  const totalInvoices = filtered.length;

  // group by sales
  const bySales = new Map<string, number>();
  filtered.forEach((i) => bySales.set(i.sales_name, (bySales.get(i.sales_name) ?? 0) + i.total));
  const chartData = Array.from(bySales.entries()).map(([name, value]) => ({ name, revenue: value }));

  const sessionOptions = sessions.map((s) => ({ value: s.id, label: s.session_code }));

  const downloadCsv = () => {
    const header = "Invoice,Customer,Sales,Total,Status";
    const rows = filtered.map((i) => [i.invoice_number, i.store_name, i.sales_name, i.total, i.invoice_status].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Report"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Reports" }, { label: "Sales" }]}
        actions={
          <>
            <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={downloadCsv}>Export CSV</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Revenue</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{totalInvoices}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Invoice</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{filtered.filter((i) => i.payment_status === "PAID").length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Lunas</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-orange-600">{filtered.filter((i) => i.invoice_status === "DELIVERED").length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Delivered</p>
        </div>
      </div>

      <div className="card">
        <p className="section-title mb-4">Revenue per Sales</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}jt`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e0e0e0", fontSize: 12 }} />
            <Bar dataKey="revenue" fill="#feda00" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari invoice / customer..." className="w-56" />
          <Select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} options={sessionOptions} placeholder="Semua Session" className="w-44" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} invoice</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-brand-gray-border">
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Invoice</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Customer</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Tanggal</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Total</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-brand-gray-border last:border-0">
                  <td className="py-3 px-4 text-xs font-semibold text-brand-black">{i.invoice_number}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-dark">{i.store_name}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-mid">{formatDate(i.created_at)}</td>
                  <td className="py-3 px-4 text-xs font-bold">{formatCurrency(i.total)}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-dark">{i.invoice_status}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-brand-gray-light text-sm">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
