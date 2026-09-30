"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CommissionReportPage() {
  const { commissions } = useData();
  const [search, setSearch] = useState("");

  const filtered = commissions.filter(
    (c) => !search || c.sales_name.toLowerCase().includes(search.toLowerCase())
  );

  const total = filtered.reduce((a, c) => a + (c.main_commission + c.own_brand_commission + c.sub_commission), 0);

  const bySales = new Map<string, number>();
  filtered.forEach((c) => bySales.set(c.sales_name, (bySales.get(c.sales_name) ?? 0) + c.main_commission + c.own_brand_commission + c.sub_commission));
  const chartData = Array.from(bySales.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commission Report"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Reports" }, { label: "Commission" }]}
        actions={<Button variant="secondary" onClick={() => window.print()}>Print</Button>}
      />

      <div className="card py-3">
        <p className="text-2xl font-bold text-brand-black">{formatCurrency(total)}</p>
        <p className="text-xs text-brand-gray-mid mt-0.5">Total Komisi</p>
      </div>

      <div className="card">
        <p className="section-title mb-4">Komisi per Sales</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}jt`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e0e0e0", fontSize: 12 }} />
            <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari sales..." className="w-56" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} transaksi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-brand-gray-border">
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Invoice</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Sales</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Main</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Own Brand</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Sub</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-brand-gray-border last:border-0">
                  <td className="py-3 px-4 text-xs font-semibold text-brand-black">{c.invoice_number}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-dark">{c.sales_name}</td>
                  <td className="py-3 px-4 text-xs">{formatCurrency(c.main_commission)}</td>
                  <td className="py-3 px-4 text-xs text-blue-600">{c.own_brand_commission ? formatCurrency(c.own_brand_commission) : "â€”"}</td>
                  <td className="py-3 px-4 text-xs text-purple-600">{c.sub_commission ? formatCurrency(c.sub_commission) : "â€”"}</td>
                  <td className="py-3 px-4 text-xs font-bold text-green-600">{formatCurrency(c.main_commission + c.own_brand_commission + c.sub_commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
