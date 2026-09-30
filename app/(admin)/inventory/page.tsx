"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MiniStat } from "@/components/ui/StatCard";
import { Table, Pagination } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { AlertTriangle, Pencil } from "lucide-react";
import type { InventoryItem, MovementType } from "@/types";

type AdjustmentType = "ADJUSTMENT" | "RETURN_DAMAGED";

export default function InventoryPage() {
  const { inventory, setDB, notify, addAudit, recalcInventory } = useData();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjType, setAdjType] = useState<AdjustmentType>("ADJUSTMENT");
  const [adjQty, setAdjQty] = useState("");
  const [adjNote, setAdjNote] = useState("");

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch =
        !search ||
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchStock =
        stockFilter === "low" ? item.available_stock <= item.warning_stock : true;
      return matchSearch && matchStock;
    });
  }, [inventory, search, stockFilter]);

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const totalPhysical = inventory.reduce((a, b) => a + b.physical_stock, 0);
  const totalReserved = inventory.reduce((a, b) => a + b.reserved_stock, 0);
  const totalAvailable = inventory.reduce((a, b) => a + b.available_stock, 0);
  const totalIncoming = inventory.reduce((a, b) => a + b.incoming_stock, 0);

  const parsedQty = Number(adjQty);
  const qtyValid = Number.isFinite(parsedQty) && parsedQty !== 0;

  const openAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjType("ADJUSTMENT");
    setAdjQty("");
    setAdjNote("");
  };

  const quickFill = (mode: "add" | "minus" | "broken") => {
    setAdjType(mode === "broken" ? "RETURN_DAMAGED" : "ADJUSTMENT");
    const n = Number(adjQty);
    const base = Number.isFinite(n) && Math.abs(n) > 0 ? Math.abs(n) : 1;
    setAdjQty(mode === "minus" ? `-${base}` : String(base));
  };

  const saveAdjust = () => {
    if (!adjustItem || !qtyValid) return;
    const qty = parsedQty;
    const absQty = Math.abs(qty);
    const user_name = user?.name ?? "Super Admin";
    const before = adjustItem.physical_stock;
    let newPhysical = before;
    let newDamaged = adjustItem.damaged_stock;

    if (adjType === "RETURN_DAMAGED") {
      newDamaged = adjustItem.damaged_stock + absQty;
    } else {
      newPhysical = Math.max(0, before + qty);
    }

    const now = new Date().toISOString();
    setDB((db) => ({
      ...db,
      inventory: db.inventory.map((inv) =>
        inv.product_id === adjustItem!.product_id
          ? { ...inv, physical_stock: newPhysical, damaged_stock: newDamaged }
          : inv
      ),
      movements: [
        {
          id: `m${Date.now()}`,
          product_id: adjustItem!.product_id,
          product_name: adjustItem!.product_name,
          sku: adjustItem!.sku,
          movement_type: adjType as MovementType,
          quantity: absQty,
          before_stock: before,
          after_stock: newPhysical,
          reference_type: "MANUAL",
          reference_id: adjustItem!.sku,
          created_by: user_name,
          created_at: now,
        },
        ...db.movements,
      ],
    }));
    recalcInventory(adjustItem.product_id);
    addAudit({
      user_name,
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "CREATE",
      module: "INVENTORY",
      record_id: adjustItem.sku,
      old_value: `${before}`,
      new_value: `${newPhysical} (${adjType}, qty ${absQty})`,
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: "Stok Disesuaikan",
      message: `${adjustItem.product_name} â€” ${
        adjType === "RETURN_DAMAGED"
          ? "masuk rusak"
          : qty > 0
          ? "stok masuk"
          : "stok keluar"
      } ${absQty}${adjNote ? ` Â· ${adjNote}` : ""}.`,
      type: "SUCCESS",
    });
    setAdjustItem(null);
  };

  const columns = [
    {
      key: "sku",
      label: "Produk",
      render: (_: unknown, row: typeof paginated[0]) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-brand-black">{row.product_name}</p>
            {row.available_stock <= row.warning_stock && (
              <AlertTriangle className="w-3 h-3 text-orange-500" />
            )}
          </div>
          <p className="text-[10px] text-brand-gray-light">{row.sku}</p>
        </div>
      ),
    },
    {
      key: "physical_stock",
      label: "Fisik",
      render: (v: unknown) => (
        <span className="text-sm font-bold text-brand-black">{String(v)}</span>
      ),
    },
    {
      key: "reserved_stock",
      label: "Reserved",
      render: (v: unknown) => (
        <span className="text-sm font-semibold text-blue-600">{String(v)}</span>
      ),
    },
    {
      key: "available_stock",
      label: "Available",
      render: (v: unknown, row: typeof paginated[0]) => (
        <span
          className={`text-sm font-bold ${
            Number(v) <= row.warning_stock ? "text-orange-600" : "text-green-600"
          }`}
        >
          {String(v)}
        </span>
      ),
    },
    {
      key: "incoming_stock",
      label: "Incoming",
      render: (v: unknown) => (
        <span
          className={`text-sm font-semibold ${
            Number(v) > 0 ? "text-purple-600" : "text-brand-gray-light"
          }`}
        >
          {Number(v) > 0 ? String(v) : "â€”"}
        </span>
      ),
    },
    {
      key: "damaged_stock",
      label: "Rusak",
      render: (v: unknown) => (
        <span
          className={`text-sm font-semibold ${
            Number(v) > 0 ? "text-red-500" : "text-brand-gray-light"
          }`}
        >
          {Number(v) > 0 ? String(v) : "â€”"}
        </span>
      ),
    },
    {
      key: "warning_stock",
      label: "Warning",
      render: (v: unknown, row: typeof paginated[0]) => (
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-gray-mid">{String(v)}</span>
          {row.available_stock <= row.warning_stock && (
            <Badge variant="warning">LOW</Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_: unknown, row: typeof paginated[0]) =>
        row.available_stock <= row.warning_stock ? (
          <Badge variant="danger">LOW STOCK</Badge>
        ) : (
          <Badge variant="success">OK</Badge>
        ),
    },
    {
      key: "actions",
      label: "Aksi",
      render: (_: unknown, row: typeof paginated[0]) => (
        <button
          onClick={() => openAdjust(row)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-black bg-brand-yellow/20 hover:bg-brand-yellow rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Stok
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Current Stock"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Inventory" }]}
      />

      {/* Formula explanation */}
      <div className="card bg-brand-yellow/10 border border-brand-yellow/30">
        <p className="text-xs font-bold text-brand-black mb-2">Formula Stok</p>
        <div className="flex flex-wrap gap-3 text-xs text-brand-gray-dark">
          <span>
            <strong className="text-brand-black">Available</strong> = Physical âˆ’ Reserved
          </span>
          <span className="text-brand-gray-border">|</span>
          <span>Saat invoice dibuat â†’ Reserved +Qty</span>
          <span className="text-brand-gray-border">|</span>
          <span>Saat dikirim â†’ Physical âˆ’Qty, Reserved âˆ’Qty</span>
          <span className="text-brand-gray-border">|</span>
          <span>Invoice batal â†’ Reserved kembali</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total Fisik" value={totalPhysical} color="gray" />
        <MiniStat label="Total Reserved" value={totalReserved} color="blue" />
        <MiniStat label="Total Available" value={totalAvailable} color="green" />
        <MiniStat label="Incoming" value={totalIncoming} color="yellow" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari produk / SKU..."
            className="w-56"
          />
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[{ value: "low", label: "Low Stock Only" }]}
            placeholder="Semua Stock"
            className="w-40"
          />
          {(search || stockFilter) && (
            <button
              className="text-xs text-brand-gray-mid hover:text-brand-black"
              onClick={() => {
                setSearch("");
                setStockFilter("");
              }}
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">
            {filtered.length} produk
          </span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={paginated as unknown as Record<string, unknown>[]}
          rowKey="product_id"
        />
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filtered.length / perPage)}
          total={filtered.length}
          perPage={perPage}
          onPageChange={setPage}
        />
      </div>

      <Modal
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        title="Penyesuaian Stok"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustItem(null)}>
              Batal
            </Button>
            <Button disabled={!qtyValid} onClick={saveAdjust}>
              Simpan
            </Button>
          </>
        }
      >
        {adjustItem && (
          <div className="space-y-3">
            <div className="rounded-xl bg-brand-bg px-4 py-3">
              <p className="text-xs font-bold text-brand-black">
                {adjustItem.product_name}
              </p>
              <p className="text-[10px] text-brand-gray-light mt-0.5">
                {adjustItem.sku} Â· Stok fisik:{" "}
                <span className="font-semibold text-brand-gray-dark">
                  {adjustItem.physical_stock}
                </span>{" "}
                Â· Rusak:{" "}
                <span className="font-semibold text-brand-gray-dark">
                  {adjustItem.damaged_stock}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-brand-gray-mid">Aksi cepat:</span>
              <button
                onClick={() => quickFill("add")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                + Tambah Stok
              </button>
              <button
                onClick={() => quickFill("minus")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                âˆ’ Kurangi
              </button>
              <button
                onClick={() => quickFill("broken")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
              >
                Stok Rusak
              </button>
            </div>

            <Select
              label="Tipe"
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
              options={[
                { value: "ADJUSTMENT", label: "Stok Masuk / Keluar" },
                { value: "RETURN_DAMAGED", label: "Rusak (RETURN_DAMAGED)" },
              ]}
            />
            <Input
              label="Jumlah"
              type="number"
              value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)}
              placeholder="0"
              hint="Gunakan tanda minus (-) untuk mengurangi stok. Stok fisik tidak akan negatif."
            />
            <Input
              label="Keterangan"
              value={adjNote}
              onChange={(e) => setAdjNote(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
