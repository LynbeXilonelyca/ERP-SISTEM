"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { useData } from "@/lib/store";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MovementType } from "@/types";

type BadgeVariant = "success" | "danger" | "info" | "warning" | "gray";

const typeConfig: Record<
  MovementType,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  PURCHASE: { label: "Pembelian", variant: "success", icon: <TrendingUp className="w-3 h-3" /> },
  SALE: { label: "Penjualan", variant: "danger", icon: <TrendingDown className="w-3 h-3" /> },
  RETURN_SELLABLE: { label: "Retur (Layak Jual)", variant: "info", icon: <TrendingUp className="w-3 h-3" /> },
  RETURN_DAMAGED: { label: "Retur (Rusak)", variant: "warning", icon: <Minus className="w-3 h-3" /> },
  ADJUSTMENT: { label: "Penyesuaian", variant: "gray", icon: <Minus className="w-3 h-3" /> },
};

export default function StockMovementsPage() {
  const { movements } = useData();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () =>
      [...movements].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [movements]
  );

  const filtered = useMemo(() => {
    return sorted.filter((m) => {
      const matchSearch =
        !search ||
        m.product_name.toLowerCase().includes(search.toLowerCase()) ||
        m.sku.toLowerCase().includes(search.toLowerCase()) ||
        m.reference_id.toLowerCase().includes(search.toLowerCase()) ||
        m.created_by.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || m.movement_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [sorted, search, typeFilter]);

  const perPage = 15;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

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
      render: (_: unknown, row: typeof paginated[0]) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.product_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.sku}</p>
        </div>
      ),
    },
    {
      key: "movement_type",
      label: "Tipe",
      render: (v: unknown) => {
        const cfg = typeConfig[String(v) as MovementType];
        return (
          <Badge variant={cfg?.variant ?? "gray"}>
            <span className="flex items-center gap-1">
              {cfg?.icon} {cfg?.label ?? String(v)}
            </span>
          </Badge>
        );
      },
    },
    {
      key: "quantity",
      label: "Qty",
      render: (v: unknown) => (
        <span
          className={`text-sm font-bold ${
            Number(v) > 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {Number(v) > 0 ? `+${v}` : String(v)}
        </span>
      ),
    },
    {
      key: "before_stock",
      label: "Stok",
      render: (_: unknown, row: typeof paginated[0]) => (
        <span className="text-xs text-brand-gray-mid whitespace-nowrap">
          <span className="font-semibold text-brand-gray-dark">{row.before_stock}</span>
          {" â†’ "}
          <span className="font-bold text-brand-black">{row.after_stock}</span>
        </span>
      ),
    },
    {
      key: "reference_id",
      label: "Referensi",
      render: (v: unknown, row: typeof paginated[0]) => (
        <div>
          <p className="text-xs font-semibold text-blue-600">{String(v)}</p>
          <p className="text-[10px] text-brand-gray-light">{row.reference_type}</p>
        </div>
      ),
    },
    {
      key: "created_by",
      label: "Oleh",
      render: (v: unknown) => (
        <span className="text-xs text-brand-gray-dark">{String(v)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Movement"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Movement" },
        ]}
      />

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari produk / referensi / petugas..."
            className="w-64"
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={Object.entries(typeConfig).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
            placeholder="Semua Tipe"
            className="w-48"
          />
          {(search || typeFilter) && (
            <button
              className="text-xs text-brand-gray-mid hover:text-brand-black"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
              }}
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">
            {filtered.length} records
          </span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={paginated as unknown as Record<string, unknown>[]}
          rowKey="id"
          emptyMessage="Belum ada pergerakan stok."
        />
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filtered.length / perPage)}
          total={filtered.length}
          perPage={perPage}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
