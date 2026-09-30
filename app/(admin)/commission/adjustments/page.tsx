"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { RotateCcw } from "lucide-react";

// Local adjustment history
type Adj = {
  id: string;
  invoice_number: string;
  customer_name: string;
  original: number;
  adjustment: number;
  final: number;
  reason: string;
  created_at: string;
};

export default function CommissionAdjustmentsPage() {
  const { commissions } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [adjustments, setAdjustments] = useState<Adj[]>([]);

  const calc = (c: (typeof commissions)[0]) =>
    c.main_commission + c.own_brand_commission + c.sub_commission;

  const demoRows: Adj[] = [
    {
      id: "adj-demo-1",
      invoice_number: "INV-2026-0885",
      customer_name: "Toko Maju Jaya",
      original: 300000,
      adjustment: -50000,
      final: 250000,
      reason: "Retur RET-2026-007",
      created_at: "2026-09-03T10:00:00",
    },
  ];

  const all = [...adjustments, ...demoRows].filter(
    (a) => !search || a.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commission Adjustments"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Commission" }, { label: "Adjustments" }]}
      />

      <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
        <div className="flex items-start gap-3">
          <RotateCcw className="w-4 h-4 text-brand-black mt-0.5 flex-shrink-0" />
          <p className="text-xs text-brand-gray-dark">
            Model <strong>adjustment tidak menghapus komisi lama</strong>. History tetap utuh:
            Original âˆ’ Adjustment = Final. Audit tetap jelas.
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari invoice..." className="w-56" />
          <span className="ml-auto text-xs text-brand-gray-light">{all.length} adjustment</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-brand-gray-border">
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Invoice</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Customer</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Original</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Adjustment</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Final</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a) => (
                <tr key={a.id} className="border-b border-brand-gray-border last:border-0">
                  <td className="py-3 px-4 text-xs font-semibold text-brand-black">{a.invoice_number}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-dark">{a.customer_name}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-dark">{formatCurrency(a.original)}</td>
                  <td className="py-3 px-4 text-xs font-bold text-red-500">{a.adjustment < 0 ? `- ${formatCurrency(Math.abs(a.adjustment))}` : formatCurrency(a.adjustment)}</td>
                  <td className="py-3 px-4 text-xs font-bold text-green-600">{formatCurrency(a.final)}</td>
                  <td className="py-3 px-4 text-xs text-brand-gray-mid">{a.reason}</td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-brand-gray-light text-sm">Belum ada adjustment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
