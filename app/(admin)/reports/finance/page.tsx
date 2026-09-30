"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function FinanceReportPage() {
  const { invoices, payments, commissions } = useData();

  const paid = payments.reduce((a, p) => a + (p.amount || 0), 0);
  const billed = invoices.filter((i) => i.invoice_status !== "CANCELLED").reduce((a, i) => a + i.total, 0);
  const outstanding = Math.max(0, billed - paid);
  const commissionTotal = commissions.reduce((a, c) => a + (c.main_commission + c.own_brand_commission + c.sub_commission), 0);

  const pieData = [
    { name: "Terbayar", value: paid },
    { name: "Outstanding", value: outstanding },
  ];
  const COLORS = ["#22c55e", "#ef4444"];

  const downloadCsv = () => {
    const header = "Invoice,Customer,Total,Terbayar,Outstanding";
    const rows = invoices.map((i) => {
      const p = payments.filter((x) => x.invoice_id === i.id).reduce((a, x) => a + x.amount, 0);
      const o = Math.max(0, i.total - p);
      return [i.invoice_number, i.store_name, i.total, p, o].join(",");
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance Report"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Reports" }, { label: "Finance" }]}
        actions={<Button variant="secondary" onClick={downloadCsv}>Export CSV</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(billed)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Tagihan</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(paid)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Terbayar</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-red-500">{formatCurrency(outstanding)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Outstanding</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(commissionTotal)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Komisi</p>
        </div>
      </div>

      <div className="card">
        <p className="section-title mb-4">Piutang: Terbayar vs Outstanding</p>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e0e0e0", fontSize: 12 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
