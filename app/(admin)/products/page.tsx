"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Pagination } from "@/components/ui/Table";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, marginInfo } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { paymentTerms } from "@/lib/seed";
import { Plus, Pencil, Star, AlertTriangle } from "lucide-react";
import type { Product, InventoryItem } from "@/types";

type Draft = {
  id: string;
  sku: string;
  name: string;
  brand_id: string;
  brand_name: string;
  category_id: string;
  category_name: string;
  sub_category_id: string;
  sub_category_name: string;
  is_own_brand: boolean;
  minimum_order: number;
  maximum_order: number;
  multiple_order: number;
  warning_stock: number;
  cost_price: number;
  prices: Record<string, number>;
  status: "ACTIVE" | "INACTIVE";
  image_url?: string;
  created_at: string;
};

type ProductRow = Product & { available_stock: number };

export default function ProductsPage() {
  const { products, brands, categories, inventory, setDB, notify, addAudit, recalcInventory } = useData();
  const { user, hasRole } = useAuth();
  const isManage = hasRole("SUPER_ADMIN") || hasRole("SALES_ADMIN") || hasRole("PURCHASE_ADMIN");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const invMap = useMemo(() => {
    const m: Record<string, InventoryItem> = {};
    inventory.forEach((i) => (m[i.product_id] = i));
    return m;
  }, [inventory]);

  const rows = useMemo<ProductRow[]>(
    () =>
      products.map((p) => ({
        ...p,
        available_stock: invMap[p.id]?.available_stock ?? 0,
      })),
    [products, invMap]
  );

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = !category || p.category_id === category;
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [rows, search, category, statusFilter]);

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const lowStockCount = rows.filter((p) => p.available_stock <= p.warning_stock).length;

  const openAdd = () => {
    setEditing(null);
    setDraft({
      id: `p${Date.now()}`,
      sku: `PRD-${String(products.length + 1).padStart(3, "0")}`,
      name: "",
      brand_id: "",
      brand_name: "",
      category_id: "",
      category_name: "",
      sub_category_id: "",
      sub_category_name: "",
      is_own_brand: false,
      minimum_order: 1,
      maximum_order: 9999,
      multiple_order: 1,
      warning_stock: 20,
      cost_price: 0,
      prices: {},
      status: "ACTIVE",
      image_url: "",
      created_at: new Date().toISOString(),
    });
    setShowForm(true);
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openAdd();
      router.replace("/products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (p: Product) => {
    setEditing(p);
    const priceMap: Record<string, number> = {};
    p.prices.forEach((x) => (priceMap[x.payment_term_id] = x.price));
    setDraft({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand_id: p.brand_id,
      brand_name: p.brand_name,
      category_id: p.category_id,
      category_name: p.category_name,
      sub_category_id: p.sub_category_id,
      sub_category_name: p.sub_category_name,
      is_own_brand: p.is_own_brand,
      minimum_order: p.minimum_order,
      maximum_order: p.maximum_order,
      multiple_order: p.multiple_order,
      warning_stock: p.warning_stock,
      cost_price: p.cost_price,
      prices: priceMap,
      status: p.status,
      image_url: p.image_url ?? "",
      created_at: p.created_at,
    });
    setShowForm(true);
  };

  const setBrand = (id: string) => {
    const b = brands.find((x) => x.id === id);
    setDraft((d) => (d ? { ...d, brand_id: id, brand_name: b?.name ?? "" } : d));
  };

  const selectCategory = (id: string) => {
    const c = categories.find((x) => x.id === id);
    setDraft((d) =>
      d
        ? {
            ...d,
            category_id: id,
            category_name: c?.name ?? "",
            sub_category_id: "",
            sub_category_name: "",
          }
        : d
    );
  };

  const setSubCategory = (id: string) => {
    const c = categories.find((x) => x.id === draft?.category_id);
    const sc = c?.sub_categories.find((x) => x.id === id);
    setDraft((d) => (d ? { ...d, sub_category_id: id, sub_category_name: sc?.name ?? "" } : d));
  };

  const setPrice = (termId: string, value: string) => {
    setDraft((d) => (d ? { ...d, prices: { ...d.prices, [termId]: Number(value) } } : d));
  };

  const subOptions = draft
    ? categories.find((c) => c.id === draft.category_id)?.sub_categories ?? []
    : [];

  const handleImageSelect = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify({ title: "File Tidak Valid", message: "Pilih file gambar (JPG/PNG/WebP).", type: "ERROR" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify({ title: "Gambar Terlalu Besar", message: "Ukuran maksimal 5 MB.", type: "ERROR" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.src = raw;
      img.onload = () => {
        const MAX = 600;
        let { width, height } = img;
        if (width > MAX) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setDraft((d) => (d ? { ...d, image_url: raw } : d));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setDraft((d) => (d ? { ...d, image_url: canvas.toDataURL("image/jpeg", 0.8) } : d));
      };
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!draft || !draft.name || !draft.sku) return;
    const prices = paymentTerms.map((pt) => ({
      payment_term_id: pt.id,
      payment_term_label: pt.label,
      price: draft.prices[pt.id] ?? 0,
      effective_from: new Date().toISOString(),
    }));
    const product: Product = {
      id: draft.id,
      sku: draft.sku,
      name: draft.name,
      brand_id: draft.brand_id,
      brand_name: draft.brand_name || "â€”",
      category_id: draft.category_id,
      category_name: draft.category_name || "â€”",
      sub_category_id: draft.sub_category_id,
      sub_category_name: draft.sub_category_name || "â€”",
      is_own_brand: draft.is_own_brand,
      minimum_order: draft.minimum_order,
      maximum_order: draft.maximum_order,
      multiple_order: draft.multiple_order,
      warning_stock: draft.warning_stock,
      cost_price: draft.cost_price,
      prices,
      status: draft.status,
      image_url: draft.image_url || undefined,
      created_at: draft.created_at,
    };
    const hasInv = inventory.some((i) => i.product_id === product.id);
    setDB((db) => ({
      ...db,
      products: editing
        ? db.products.map((p) => (p.id === editing.id ? product : p))
        : [...db.products, product],
      inventory: hasInv
        ? db.inventory.map((i) =>
            i.product_id === product.id
              ? { ...i, product_name: product.name, sku: product.sku, warning_stock: product.warning_stock }
              : i
          )
        : [
            ...db.inventory,
            {
              product_id: product.id,
              product_name: product.name,
              sku: product.sku,
              physical_stock: 0,
              reserved_stock: 0,
              available_stock: 0,
              incoming_stock: 0,
              damaged_stock: 0,
              warning_stock: product.warning_stock,
            },
          ],
    }));
    recalcInventory(product.id);
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: editing ? "UPDATE" : "CREATE",
      module: "PRODUCT",
      record_id: product.sku,
      old_value: editing ? "EXISTS" : "NONE",
      new_value: product.name,
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: editing ? "Produk Diperbarui" : "Produk Ditambahkan",
      message: `${product.name} tersimpan.`,
      type: "SUCCESS",
    });
    setShowForm(false);
  };

  const cashPrice = (p: ProductRow) => p.prices.find((x) => x.payment_term_id === "pt0")?.price ?? 0;

  const columns = [
    {
      key: "sku",
      label: "Produk",
      render: (_: unknown, row: ProductRow) => (
        <div className="flex items-center gap-2.5">
          {row.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.image_url} alt={row.name} className="w-8 h-8 rounded-lg object-cover bg-brand-bg flex-shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-brand-black">{row.name}</p>
              {row.is_own_brand && <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" />}
            </div>
            <p className="text-[10px] text-brand-gray-light mt-0.5">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category_name",
      label: "Kategori",
      render: (_: unknown, row: ProductRow) => (
        <div>
          <p className="text-xs text-brand-gray-dark">{row.category_name || "â€”"}</p>
          {row.sub_category_name && (
            <p className="text-[10px] text-brand-gray-light">{row.sub_category_name}</p>
          )}
        </div>
      ),
    },
    {
      key: "brand_name",
      label: "Brand",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v || "â€”")}</span>,
    },
    {
      key: "stok",
      label: "Stok",
      render: (_: unknown, row: ProductRow) => {
        const low = row.available_stock <= row.warning_stock;
        return (
          <div className="flex items-center gap-1.5">
            {low && <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />}
            <p className={cn("text-xs font-bold", low ? "text-orange-600" : "text-brand-black")}>
              {row.available_stock}
            </p>
            {low && <Badge variant="danger">Low</Badge>}
          </div>
        );
      },
    },
    {
      key: "harga_jual",
      label: "Harga Jual",
      render: (_: unknown, row: ProductRow) => (
        <span className="text-xs font-semibold text-brand-black">{formatCurrency(cashPrice(row))}</span>
      ),
    },
    {
      key: "margin",
      label: "Margin",
      render: (_: unknown, row: ProductRow) => {
        const mi = marginInfo(cashPrice(row), row.cost_price);
        return (
          <span
            className={cn(
              "text-xs font-semibold",
              mi.level === "danger" ? "text-red-500" : mi.level === "warning" ? "text-orange-500" : "text-green-600"
            )}
          >
            {mi.marginPct.toFixed(0)}%
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <Badge variant={v === "ACTIVE" ? "success" : "gray"}>{String(v)}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: ProductRow) =>
        isManage ? (
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[10px] text-brand-gray-light">Lihat</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Product" }]}
        actions={
          isManage ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
              Tambah Produk
            </Button>
          ) : undefined
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Produk", value: products.length, color: "bg-brand-yellow/20 text-brand-black" },
          { label: "Produk Aktif", value: products.filter((p) => p.status === "ACTIVE").length, color: "bg-green-50 text-green-700" },
          { label: "Own Brand", value: products.filter((p) => p.is_own_brand).length, color: "bg-blue-50 text-blue-700" },
          { label: "Low Stock", value: lowStockCount, color: "bg-orange-50 text-orange-700" },
        ].map((s) => (
          <div key={s.label} className={`card flex items-center gap-3 py-3 ${s.color}`}>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari produk atau SKU..."
            className="w-56"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Semua Kategori"
            className="w-44"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            placeholder="Semua Status"
            className="w-36"
          />
          {(search || category || statusFilter) && (
            <button
              className="text-xs text-brand-gray-mid hover:text-brand-black transition-colors"
              onClick={() => { setSearch(""); setCategory(""); setStatusFilter(""); }}
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
          rowKey="id"
        />
        {filtered.length > perPage && (
          <div className="p-4 border-t border-brand-gray-border">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filtered.length / perPage)}
              total={filtered.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Produk" : "Tambah Produk Baru"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={!draft?.name || !draft?.sku} onClick={save}>
              {editing ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            {/* Foto Produk */}
            <div>
              <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
                Foto Produk <span className="normal-case font-normal text-brand-gray-light">(opsional)</span>
              </p>
              <div className="flex items-center gap-4">
                <label className="relative w-24 h-24 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 border-2 border-dashed border-brand-gray-border bg-brand-bg hover:border-brand-yellow transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0])} />
                  {draft.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.image_url} alt={draft.name || "Foto produk"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full text-brand-gray-light text-[10px] text-center px-1 leading-tight">
                      Pilih Foto
                    </span>
                  )}
                </label>
                {draft.image_url && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, image_url: "" })}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-600"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div>
              <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">Informasi Dasar</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nama Produk"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Masukkan nama produk"
                />
                <Input
                  label="SKU"
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  placeholder="PRD-001"
                />
                <Select
                  label="Brand"
                  value={draft.brand_id}
                  onChange={(e) => setBrand(e.target.value)}
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  placeholder="Pilih Brand"
                />
                <Select
                  label="Kategori"
                  value={draft.category_id}
                  onChange={(e) => selectCategory(e.target.value)}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Pilih Kategori"
                />
                <Select
                  label="Sub Kategori"
                  value={draft.sub_category_id}
                  onChange={(e) => setSubCategory(e.target.value)}
                  options={subOptions.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder={draft.category_id ? "Pilih Sub Kategori" : "Pilih Kategori dulu"}
                />
                <Select
                  label="Own Brand"
                  value={String(draft.is_own_brand)}
                  onChange={(e) => setDraft({ ...draft, is_own_brand: e.target.value === "true" })}
                  options={[
                    { value: "true", label: "Ya" },
                    { value: "false", label: "Tidak" },
                  ]}
                />
                <Select
                  label="Status"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                  ]}
                />
              </div>
              {draft.is_own_brand && (
                <p className="mt-2 text-xs text-brand-gray-mid flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" /> Own Brand â€” menambah komisi utama.
                </p>
              )}
            </div>

            {/* Order Rules */}
            <div>
              <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">Aturan Order</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  label="Minimum Order" type="number" value={draft.minimum_order}
                  onChange={(e) => setDraft({ ...draft, minimum_order: Number(e.target.value) })}
                  hint="Unit terkecil pembelian"
                />
                <Input
                  label="Maximum Order" type="number" value={draft.maximum_order}
                  onChange={(e) => setDraft({ ...draft, maximum_order: Number(e.target.value) })}
                />
                <Input
                  label="Multiple Order" type="number" value={draft.multiple_order}
                  onChange={(e) => setDraft({ ...draft, multiple_order: Number(e.target.value) })}
                  hint="Kelipatan qty"
                />
                <Input
                  label="Warning Stock" type="number" value={draft.warning_stock}
                  onChange={(e) => setDraft({ ...draft, warning_stock: Number(e.target.value) })}
                  hint="Alert jika stok â‰¤ nilai ini"
                />
              </div>
            </div>

            {/* Cost Price */}
            <div>
              <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
                Harga Modal
              </p>
              <Input
                label="Harga Modal (Cost Price)" type="number" value={draft.cost_price}
                onChange={(e) => setDraft({ ...draft, cost_price: Number(e.target.value) })}
                placeholder="0"
                hint="Harga beli / cost of goods."
              />
            </div>

            {/* Pricing per Payment Term */}
            <div>
              <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">
                Harga Jual per Payment Term
              </p>
              <div className="space-y-2">
                {paymentTerms.map((pt) => (
                  <div key={pt.id} className="flex items-center gap-3">
                    <span className="text-xs text-brand-gray-dark w-40 flex-shrink-0">{pt.label}</span>
                    <input
                      type="number"
                      placeholder="0"
                      className="form-input flex-1"
                      value={draft.prices[pt.id] ?? ""}
                      onChange={(e) => setPrice(pt.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-brand-gray-light mt-2">
                Harga akan berlaku efektif mulai hari ini. Invoice lama tidak terpengaruh.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
