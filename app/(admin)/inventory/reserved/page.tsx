"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { useData } from "@/lib/store";
import { ShoppingCart } from "lucide-react";

export default function ReservedStockPage() {
  const { inventory } = useData();
  const [search, setSearch] = useState("");

  const withReserved = inventory.filter((i) => i.reserved_stock > 0);
  const filtered = withReserved.filter(
    (i) => !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalReserved = withReserved.reduce((a, i) => a + i.reserved_stock, 0);

  const columns = [
    {
      key: "sku",
      label: "Produk",
      render: (_: unknown, row: (typeof withReserved)[0]) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.product_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.sku}</p>
        </div>
      ),
    },
    { key: "reserved_stock", label: "Reserved", render: (v: unknown) => <span className="text-sm font-bold text-blue-600">{String(v)}</span> },
    { key: "physical_stock", label: "Fisik", render: (v: unknown) => <span className="text-sm text-brand-gray-dark">{String(v)}</span> },
    { key: "available_stock", label: "Available", render: (v: unknown) => <span className="text-sm font-semibold text-green-600">{String(v)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reserved Stock"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Inventory" }, { label: "Reserved" }]}
      />

      <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
        <div className="flex items-start gap-3">
          <ShoppingCart className="w-4 h-4 text-brand-black mt-0.5 flex-shrink-0" />
          <p className="text-xs text-brand-gray-dark">
            Saat invoice dibuat, barang masuk <strong>reserved</strong> agar tidak dijual dua kali.
            Saat dikirim, reserved dilepas dan fisik berkurang. Invoice batal â†’ reserved kembali.
          </p>
        </div>
      </div>

      <div className="card py-3">
        <p className="text-2xl font-bold text-blue-600">{totalReserved} unit</p>
        <p className="text-xs text-brand-gray-mid mt-0.5">Total Reserved</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari produk / SKU..." className="w-56" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} produk reserved</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="product_id"
        />
      </div>
    </div>
  );
}
