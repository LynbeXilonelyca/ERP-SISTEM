"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { RoleBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { useData } from "@/lib/store";

export default function PriceHistoryPage() {
  const { auditLogs, products } = useData();
  const [search, setSearch] = useState("");

  const priceLogs = auditLogs.filter((l) => l.module === "PRICE");

  const enriched = priceLogs.map((l) => {
    const prod = products.find((p) => p.sku === l.record_id);
    return { ...l, product_name: prod?.name ?? l.record_id };
  });

  const filtered = enriched.filter(
    (l) =>
      !search ||
      l.product_name.toLowerCase().includes(search.toLowerCase()) ||
      l.record_id.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: "created_at",
      label: "Waktu",
      render: (v: unknown) => (
        <span className="text-xs text-brand-gray-mid whitespace-nowrap">
          {formatDateTime(String(v))}
        </span>
      ),
    },
    {
      key: "product_name",
      label: "Produk",
      render: (_: unknown, row: (typeof enriched)[0]) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.product_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.record_id}</p>
        </div>
      ),
    },
    {
      key: "old_value",
      label: "Harga Lama",
      render: (v: unknown) => (
        <span className="text-xs text-red-500 font-mono">
          {v ? `Rp ${Number(v).toLocaleString("id-ID")}` : "â€”"}
        </span>
      ),
    },
    {
      key: "new_value",
      label: "Harga Baru",
      render: (v: unknown) => (
        <span className="text-xs text-green-600 font-mono">
          {v ? `Rp ${Number(v).toLocaleString("id-ID")}` : "â€”"}
        </span>
      ),
    },
    {
      key: "user_name",
      label: "Diubah Oleh",
      render: (_: unknown, row: (typeof enriched)[0]) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.user_name}</p>
          <RoleBadge role={row.user_role} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Price History"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Product", href: "/products" }, { label: "Price History" }]}
      />

      <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
        <p className="text-xs text-brand-gray-dark">
          <strong className="text-brand-black">Snapshot harga invoice:</strong>{" "}
          Invoice lama tetap memakai harga saat transaksi dibuat dan tidak ikut berubah
          saat harga master diperbarui. Setiap perubahan harga tercatat di sini beserta
          user dan nilai lama/baru.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari produk / SKU..." className="w-64" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} perubahan</span>
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
