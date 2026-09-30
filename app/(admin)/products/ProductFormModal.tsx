"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Star } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: Record<string, unknown>;
}

export default function ProductFormModal({ open, onClose, initialData }: Props) {
  const [form, setForm] = useState({
    name: (initialData?.name as string) ?? "",
    sku: (initialData?.sku as string) ?? "",
    brand_id: (initialData?.brand_id as string) ?? "",
    category_id: (initialData?.category_id as string) ?? "",
    sub_category_id: (initialData?.sub_category_id as string) ?? "",
    is_own_brand: (initialData?.is_own_brand as boolean) ?? false,
    minimum_order: (initialData?.minimum_order as string) ?? "1",
    maximum_order: (initialData?.maximum_order as string) ?? "9999",
    multiple_order: (initialData?.multiple_order as string) ?? "1",
    warning_stock: (initialData?.warning_stock as string) ?? "20",
    cost_price: (initialData?.cost_price as string) ?? "",
    status: (initialData?.status as string) ?? "ACTIVE",
    notes: "",
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Produk" : "Tambah Produk Baru"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={onClose}>Simpan Produk</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Basic Info */}
        <div>
          <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
            Informasi Dasar
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nama Produk"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Masukkan nama produk"
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="PRD-001"
            />
            <Select
              label="Brand"
              value={form.brand_id}
              onChange={(e) => set("brand_id", e.target.value)}
              options={[
                { value: "b1", label: "Kirana" },
                { value: "b2", label: "Sinar" },
              ]}
              placeholder="Pilih Brand"
            />
            <Select
              label="Kategori"
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              options={[
                { value: "1", label: "Cairan" },
                { value: "2", label: "Padat" },
              ]}
              placeholder="Pilih Kategori"
            />
            <Select
              label="Sub Kategori"
              value={form.sub_category_id}
              onChange={(e) => set("sub_category_id", e.target.value)}
              options={[
                { value: "1", label: "Premium" },
                { value: "2", label: "Standard" },
                { value: "3", label: "Economy" },
              ]}
              placeholder="Pilih Sub Kategori"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </div>

          {/* Own Brand toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  form.is_own_brand ? "bg-brand-yellow" : "bg-gray-200"
                }`}
                onClick={() => set("is_own_brand", !form.is_own_brand)}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.is_own_brand ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-brand-black">
                <Star className="w-3.5 h-3.5 text-brand-yellow fill-brand-yellow" />
                Own Brand (menambah komisi utama)
              </span>
            </label>
          </div>
        </div>

        {/* Order Rules */}
        <div>
          <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
            Aturan Order
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Minimum Order"
              type="number"
              value={form.minimum_order}
              onChange={(e) => set("minimum_order", e.target.value)}
              hint="Unit terkecil pembelian"
            />
            <Input
              label="Maximum Order"
              type="number"
              value={form.maximum_order}
              onChange={(e) => set("maximum_order", e.target.value)}
            />
            <Input
              label="Multiple Order"
              type="number"
              value={form.multiple_order}
              onChange={(e) => set("multiple_order", e.target.value)}
              hint="Kelipatan qty"
            />
            <Input
              label="Warning Stock"
              type="number"
              value={form.warning_stock}
              onChange={(e) => set("warning_stock", e.target.value)}
              hint="Alert jika stok ≤ nilai ini"
            />
          </div>
          <div className="mt-3 p-3 bg-brand-yellow/10 rounded-xl text-xs text-brand-gray-dark">
            <strong>Contoh:</strong> Min=6, Max=120, Mult=6 → Order qty 7 otomatis dibulatkan ke 12.
            Order qty 121 akan ditolak sistem.
          </div>
        </div>

        {/* Cost Price */}
        <div>
          <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
            Harga Modal <span className="normal-case font-normal text-red-500">(Super Admin only)</span>
          </p>
          <Input
            label="Harga Modal (Cost Price)"
            type="number"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
            placeholder="0"
            hint="Harga beli / cost of goods. Hanya terlihat oleh Super Admin."
          />
        </div>

        {/* Pricing per Payment Term */}
        <div>
          <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
            Harga Jual per Payment Term
          </p>
          <div className="space-y-2">
            {[
              { term: "Cash (0 hari)", days: 0 },
              { term: "1 Hari", days: 1 },
              { term: "1 Minggu (7 hari)", days: 7 },
              { term: "1 Bulan (30 hari)", days: 30 },
              { term: "3 Bulan (90 hari)", days: 90 },
            ].map((t) => (
              <div key={t.days} className="flex items-center gap-3">
                <span className="text-xs text-brand-gray-dark w-40 flex-shrink-0">
                  {t.term}
                </span>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input flex-1"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-gray-light mt-2">
            Harga akan berlaku efektif mulai hari ini. Invoice lama tidak terpengaruh.
          </p>
        </div>

        <Textarea
          label="Catatan"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Catatan tambahan (opsional)"
        />
      </div>
    </Modal>
  );
}
