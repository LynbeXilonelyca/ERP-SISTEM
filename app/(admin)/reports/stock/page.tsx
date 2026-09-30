"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MiniStat } from "@/components/ui/StatCard";
import { useData } from "@/lib/store";
import { AlertTriangle } from "lucide-react";

export default function StockReportPage() {
  const { inventory, movements } = useData();
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState("");

  const filtered = inventory.filter((inv) => {
    const matchSearch = !search || inv.product_name.toLowerCase().includes(search.toLowerCase()) || inv.sku.toLowerCase().includes(search.toLowerCase());
    const matchLow = lowOnly === "low" ? inv.available_stock <= inv.warning_stock : true;
    return matchSearch && matchLow;
  });

  const totalPhysical = inventory.reduce((a, b) => a + b.physical_stock, 0);
  const totalReserved = inventory.reduce((a, b) => a + b.reserved_stock, 0);
  const totalAvailable = inventory.reduce((a, b) => a + b.available_stock, 0);
  const totalIncoming = inventory.reduce((a, b) => a + b.incoming_stock, 0);

  const downloadCsv = () => {
    const header = "SKU,Produk,Fisik,Reserved,Available,Incoming,Warning";
    const rows = filtered.map((r) => [r.sku, r.product_name, r.physical_stock, r.reserved_stock, r.available_stock, r.incoming_stock, r.warning_stock].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Report"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Reports" }, { label: "Stock" }]}
        actions={<Button variant="secondary" onClick={downloadCsv}>Export CSV</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total Fisik" value={totalPhysical} color="gray" />
        <MiniStat label="Total Reserved" value={totalReserved} color="blue" />
        <MiniStat label="Total Available" value={totalAvailable} color="green" />
        <MiniStat label="Incoming" value={totalIncoming} color="yellow" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari produk / SKU..." className="w-56" />
          <Select value={lowOnly} onChange={(e) => setLowOnly(e.target.value)} options={[{ value: "low", label: "Low Stock Only" }]} placeholder="Semua Stock" className="w-40" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} produk Â· {movements.length} pergerakan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-brand-gray-border">
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Produk</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Fisik</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Reserved</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Available</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Incoming</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.product_id} className="border-b border-brand-gray-border last:border-0">
                  <td className="py-3 px-4">
                    <p className="text-xs font-semibold text-brand-black">{r.product_name}</p>
                    <p className="text-[10px] text-brand-gray-light">{r.sku}</p>
                  </td>
                  <td className="py-3 px-4 text-sm font-bold">{r.physical_stock}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-blue-600">{r.reserved_stock}</td>
                  <td className={`py-3 px-4 text-sm font-bold ${r.available_stock <= r.warning_stock ? "text-orange-600" : "text-green-600"}`}>{r.available_stock}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-purple-600">{r.incoming_stock > 0 ? r.incoming_stock : "â€”"}</td>
                  <td className="py-3 px-4">
                    {r.available_stock === 0 ? (
                      <span className="badge bg-red-100 text-red-700">OUT OF STOCK</span>
                    ) : r.available_stock <= r.warning_stock ? (
                      <span className="badge bg-orange-100 text-orange-700"><AlertTriangle className="w-3 h-3" /> LOW</span>
                    ) : (
                      <span className="badge bg-green-100 text-green-700">NORMAL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
