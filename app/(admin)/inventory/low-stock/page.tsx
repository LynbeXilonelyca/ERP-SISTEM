"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle } from "lucide-react";
import { useData } from "@/lib/store";

export default function LowStockPage() {
  const { inventory } = useData();
  const [search, setSearch] = useState("");

  const low = inventory.filter((i) => i.available_stock <= i.warning_stock);
  const filtered = low.filter(
    (i) => !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: "sku",
      label: "Produk",
      render: (_: unknown, row: (typeof low)[0]) => (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-brand-black">{row.product_name}</p>
            <p className="text-[10px] text-brand-gray-light">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "available_stock",
      label: "Stock Tersisa",
      render: (_: unknown, row: (typeof low)[0]) => (
        <span className={`text-sm font-bold ${row.available_stock === 0 ? "text-red-500" : "text-orange-600"}`}>
          {row.available_stock}
        </span>
      ),
    },
    { key: "warning_stock", label: "Warning Level", render: (v: unknown) => <span className="text-xs text-brand-gray-mid">â‰¤ {String(v)}</span> },
    { key: "incoming_stock", label: "Incoming", render: (v: unknown) => (
      <span className={`text-xs font-semibold ${Number(v) > 0 ? "text-purple-600" : "text-brand-gray-light"}`}>
        {Number(v) > 0 ? `${v} unit` : "â€”"}
      </span>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Low Stock"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Inventory" }, { label: "Low Stock" }]}
      />

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari produk / SKU..." className="w-56" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} produk kritis</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="product_id"
        />
        <div className="p-4 border-t border-brand-gray-border">
          <Badge variant="warning">Nyalakan notifikasi stok rendah</Badge>
        </div>
      </div>
    </div>
  );
}
