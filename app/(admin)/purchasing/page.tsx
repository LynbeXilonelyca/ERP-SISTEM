"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Upload, Plus, Trash2, CheckCircle, XCircle, Eye, ShoppingCart, FileText, ClipboardList, AlertTriangle, BellRing } from "lucide-react";

const statusBlock: Record<string, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  SUBMITTED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  APPROVED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

type NewItem = { product_id: string; product_name: string; sku: string; quantity: number; cost_price: number; subtotal: number };

export default function PurchasingPage() {
  const { purchases, invoices, products, inventory, suppliers, users, orders, setDB, notify, addAudit, recalcInventory } = useData();
  const { user, hasRole } = useAuth();
  const [tab, setTab] = useState<"purchases" | "invoices">("purchases");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [forSalesId, setForSalesId] = useState("");
  const [items, setItems] = useState<NewItem[]>([]);
  const [notes, setNotes] = useState("");
  const [invoicePhoto, setInvoicePhoto] = useState<string>("");
  const [previewPhoto, setPreviewPhoto] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [viewTarget, setViewTarget] = useState<(typeof purchases)[number] | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const isSuper = hasRole("SUPER_ADMIN");
  const isPurchase = hasRole("PURCHASE_ADMIN");
  const activeSuppliers = suppliers.filter((s) => s.status === "ACTIVE");
  const salesUsers = users.filter((u) => u.role === "SALES" && u.status === "ACTIVE");

  const filteredPurchases = purchases.filter((p) => {
    const matchSearch =
      !search ||
      p.purchase_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.requested_by_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const lowStock = products
    .filter((p) => p.status === "ACTIVE")
    .map((p) => {
      const inv = inventory.find((i) => i.product_id === p.id);
      return { product: p, avail: inv?.available_stock ?? 0, warning: inv?.warning_stock ?? p.warning_stock };
    })
    .filter((x) => x.avail <= x.warning)
    .sort((a, b) => a.avail - b.avail);

  const sendRestockRequest = (productName: string) => {
    notify({
      title: "Permintaan Restock",
      message: `Super Admin meminta restock: ${productName}. Segera buat purchase request dengan bukti foto invoice wajib.`,
      type: "WARNING",
      target_role: "PURCHASE_ADMIN",
    });
    notify({ title: "Permintaan Restock Dikirim", message: `Notifikasi restock untuk ${productName} dikirim ke Admin Pembelian.`, type: "SUCCESS" });
  };

  const perPage = 10;
  const paginated = filteredPurchases.slice((page - 1) * perPage, page * perPage);

  // â”€â”€â”€ Create purchase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addItem = () =>
    setItems((prev) => [...prev, { product_id: "", product_name: "", sku: "", quantity: 0, cost_price: 0, subtotal: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<NewItem>) => {
    setItems((prev) => {
      const next = [...prev];
      let it = { ...next[idx], ...patch };
      const product = products.find((p) => p.id === it.product_id);
      if (product) {
        it.product_name = product.name;
        it.sku = product.sku;
        if (patch.cost_price === undefined) it.cost_price = it.cost_price || product.cost_price;
      } else if (patch.product_id) {
        it.product_name = "";
        it.sku = "";
      }
      it.subtotal = (it.quantity || 0) * (it.cost_price || 0);
      next[idx] = it;
      return next;
    });
  };

  const totalAmount = items.reduce((a, i) => a + i.subtotal, 0);
  const itemsValid = items.length > 0 && items.every((i) => i.product_id && i.quantity > 0 && i.cost_price > 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setInvoicePhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitPurchase = () => {
    if (!itemsValid || !invoicePhoto || !supplierId || !forSalesId || !isPurchase) return;
    const now = new Date().toISOString();
    const code = `PRC-2026-${String(purchases.length + 41).padStart(3, "0")}`;
    const supplier = activeSuppliers.find((s) => s.id === supplierId);
    const forSales = salesUsers.find((s) => s.id === forSalesId);
    setDB((db) => ({
      ...db,
      purchases: [
        ...db.purchases,
        {
          id: `pr${Date.now()}`,
          purchase_code: code,
          supplier_id: supplier?.id ?? "",
          supplier_name: supplier?.name ?? "",
          for_sales_id: forSales?.id ?? "",
          for_sales_name: forSales?.name ?? "",
          items: items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            sku: i.sku,
            quantity: i.quantity,
            cost_price: i.cost_price,
            subtotal: i.subtotal,
          })),
          total_amount: totalAmount,
          status: "SUBMITTED" as const,
          invoice_url: invoicePhoto,
          notes,
          requested_by: user?.id ?? "u8",
          requested_by_name: user?.name ?? "Admin Pembelian",
          created_at: now,
        },
      ],
    }));
    addAudit({
      user_name: user?.name ?? "Admin Pembelian",
      user_role: user?.role ?? "PURCHASE_ADMIN",
      action: "CREATE",
      module: "PURCHASE",
      record_id: code,
      old_value: "",
      new_value: "SUBMITTED",
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Purchase Baru", message: `${code} dikirim ke Super Admin untuk disetujui.`, type: "INFO", target_role: "SUPER_ADMIN" });
    setItems([]);
    setNotes("");
    setInvoicePhoto("");
    setSupplierId("");
    setForSalesId("");
    setConfirmSubmit(false);
    setShowCreate(false);
  };

  const approvePurchase = (p: (typeof purchases)[number]) => {
    const now = new Date().toISOString();
    setDB((db) => ({
      ...db,
      purchases: db.purchases.map((x) =>
        x.id === p.id
          ? { ...x, status: "APPROVED" as const, approved_by: user?.id ?? "u1", approved_by_name: user?.name, approved_at: now }
          : x
      ),
      inventory: db.inventory.map((inv) => {
        const item = p.items.find((pi) => pi.product_id === inv.product_id);
        return item ? { ...inv, physical_stock: inv.physical_stock + item.quantity } : inv;
      }),
    }));
    p.items.forEach((item) => {
      recalcInventory(item.product_id);
      setDB((db) => ({
        ...db,
        movements: [
          ...db.movements,
          {
            id: `m${Date.now()}-${item.product_id}`,
            product_id: item.product_id,
            product_name: item.product_name,
            sku: item.sku,
            movement_type: "PURCHASE" as const,
            quantity: item.quantity,
            before_stock: 0,
            after_stock: 0,
            reference_type: "PURCHASE",
            reference_id: p.purchase_code,
            created_by: user?.name ?? "Super Admin",
            created_at: now,
          },
        ],
      }));
    });
    // Buat order untuk sales yang dituju (jalur pengadaan â†’ penjualan)
    if (p.for_sales_id) {
      const order = {
        id: `ord${Date.now()}`,
        order_code: `ORD-2026-${String(orders.length + 1).padStart(3, "0")}`,
        purchase_id: p.id,
        purchase_code: p.purchase_code,
        supplier_id: p.supplier_id,
        supplier_name: p.supplier_name,
        sales_id: p.for_sales_id,
        sales_name: p.for_sales_name ?? "",
        items: p.items,
        total_amount: p.total_amount,
        status: "AWAITING_SALES" as const,
        created_at: now,
      };
      setDB((db) => ({ ...db, orders: [...db.orders, order] }));
      notify({
        title: "Ada Orderan Masuk",
        message: `Order ${order.order_code} dari supplier ${order.supplier_name} menunggu cek ketersediaan barang oleh ${order.sales_name}.`,
        type: "SUCCESS",
        target_role: "SALES",
      });
    }
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "APPROVE",
      module: "PURCHASE",
      record_id: p.purchase_code,
      old_value: "SUBMITTED",
      new_value: "APPROVED",
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Purchase Disetujui", message: `${p.purchase_code} disetujui â€” stok bertambah & produk bisa dijual.`, type: "SUCCESS", target_role: "PURCHASE_ADMIN" });
  };

  const rejectPurchase = (p: (typeof purchases)[number]) => {
    setDB((db) => ({
      ...db,
      purchases: db.purchases.map((x) =>
        x.id === p.id
          ? { ...x, status: "REJECTED" as const, approved_by: user?.id ?? "u1", approved_by_name: user?.name, approved_at: new Date().toISOString() }
          : x
      ),
    }));
    notify({ title: "Purchase Ditolak", message: `${p.purchase_code} ditolak.`, type: "ERROR", target_role: "PURCHASE_ADMIN" });
    setRejectId(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchasing"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Purchasing" }]}
        actions={
          isPurchase ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              Buat Purchase Request
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("purchases")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2",
            tab === "purchases" ? "bg-brand-black text-white" : "bg-white text-brand-gray-mid border border-brand-gray-border hover:bg-brand-bg"
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Purchase Requests
        </button>
        <button
          onClick={() => setTab("invoices")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2",
            tab === "invoices" ? "bg-brand-black text-white" : "bg-white text-brand-gray-mid border border-brand-gray-border hover:bg-brand-bg"
          )}
        >
          <FileText className="w-3.5 h-3.5" /> Invoice Penjualan
        </button>
      </div>

      {tab === "purchases" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Request", value: purchases.length, color: "" },
              { label: "Submitted", value: purchases.filter((p) => p.status === "SUBMITTED").length, color: "text-blue-600" },
              { label: "Approved", value: purchases.filter((p) => p.status === "APPROVED").length, color: "text-green-600" },
              { label: "Rejected", value: purchases.filter((p) => p.status === "REJECTED").length, color: "text-red-500" },
            ].map((s) => (
              <div key={s.label} className="card py-3">
                <p className={cn("text-2xl font-bold", s.color || "text-brand-black")}>{s.value}</p>
                <p className="text-xs text-brand-gray-mid mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {lowStock.length > 0 && (
            <div className="card bg-red-50/60 border border-red-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-xs font-bold text-red-600 uppercase">Low Stock Alert â€” {lowStock.length} produk</p>
              </div>
              <div className="space-y-2">
                {lowStock.map((x) => (
                  <div key={x.product.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-red-100 px-4 py-2.5">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-xs font-bold text-brand-black">{x.product.name}</p>
                      <p className="text-[10px] text-brand-gray-light">{x.product.sku}</p>
                    </div>
                    <div className="w-32">
                      <p className="text-[10px] text-brand-gray-light uppercase">Available</p>
                      <p className={cn("text-sm font-bold", x.avail <= 5 ? "text-red-600" : "text-orange-600")}>{x.avail} unit</p>
                    </div>
                    <div className="w-32">
                      <p className="text-[10px] text-brand-gray-light uppercase">Warning</p>
                      <p className="text-sm font-semibold text-brand-gray-mid">â‰¤ {x.warning} unit</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSuper && (
                        <Button size="sm" icon={<BellRing className="w-3.5 h-3.5" />} onClick={() => sendRestockRequest(x.product.name)}>
                          Kirim Permintaan Restock
                        </Button>
                      )}
                      {isPurchase && (
                        <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
                          Buat Purchase
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari kode purchase..." className="w-56" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "DRAFT", label: "Draft" },
                  { value: "SUBMITTED", label: "Submitted" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
                placeholder="Semua Status"
                className="w-40"
              />
              <span className="ml-auto text-xs text-brand-gray-light">{filteredPurchases.length} request</span>
            </div>
            <div className="p-3 space-y-2.5">
              {paginated.map((p) => {
                const s = statusBlock[p.status] ?? statusBlock.DRAFT;
                return (
                  <div key={p.id} className={cn("rounded-2xl px-4 py-3 flex flex-wrap items-center gap-4 transition-shadow", s.bg)}>
                    <div className="flex items-center gap-2 w-36 flex-shrink-0">
                      <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", s.dot)} />
                      <span className={cn("text-xs font-bold uppercase", s.text)}>{p.status}</span>
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <p className="text-xs font-bold text-brand-black">{p.purchase_code}</p>
                      <p className="text-[10px] text-brand-gray-light">{formatDate(p.created_at)}</p>
                    </div>
                    <div className="w-40 flex-shrink-0">
                      <p className="text-[10px] text-brand-gray-light uppercase tracking-wide">Dibuat Oleh</p>
                      <p className="text-xs text-brand-gray-dark">{p.requested_by_name}</p>
                    </div>
                    <div className="w-36 flex-shrink-0">
                      <p className="text-[10px] text-brand-gray-light uppercase tracking-wide">Supplier</p>
                      <p className="text-xs text-brand-gray-dark">{p.supplier_name || "â€”"}</p>
                      {p.for_sales_name && <p className="text-[10px] text-blue-600 font-semibold">Untuk: {p.for_sales_name}</p>}
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <p className="text-[10px] text-brand-gray-light uppercase tracking-wide">Items</p>
                      <p className="text-sm font-semibold text-brand-black">{p.items.length} item</p>
                    </div>
                    <div className="w-36 flex-shrink-0">
                      <p className="text-[10px] text-brand-gray-light uppercase tracking-wide">Total</p>
                      <p className="text-sm font-bold text-brand-black">{formatCurrency(p.total_amount)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.invoice_url && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/70 text-brand-gray-mid hover:text-blue-600 transition-colors"
                          title="Bukti foto"
                          onClick={() => {
                            setPreviewSrc(p.invoice_url ?? "");
                            setPreviewPhoto(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg hover:bg-white/70 text-brand-gray-mid hover:text-brand-black transition-colors"
                        title="Detail"
                        onClick={() => setViewTarget(p)}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      {p.status === "SUBMITTED" && isSuper && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/70 text-brand-gray-mid hover:text-green-600 transition-colors"
                          title="Approve"
                          onClick={() => approvePurchase(p)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {p.status === "SUBMITTED" && isSuper && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/70 text-brand-gray-mid hover:text-red-500 transition-colors"
                          title="Reject"
                          onClick={() => setRejectId(p.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {paginated.length === 0 && <p className="p-8 text-sm text-brand-gray-light text-center">Belum ada purchase request.</p>}
            </div>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredPurchases.length / perPage)}
              total={filteredPurchases.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-brand-gray-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand-gray-mid" />
              <p className="text-xs text-brand-gray-dark">
                Akses baca untuk referensi. Admin Pembelian dapat melihat invoice penjualan yang berjalan.
              </p>
            </div>
          </div>
          <div className="p-3 space-y-2.5">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-2xl px-4 py-3 bg-brand-bg flex flex-wrap items-center gap-4">
                <div className="min-w-[160px] flex-1">
                  <p className="text-xs font-bold text-brand-black">{inv.invoice_number}</p>
                  <p className="text-[10px] text-brand-gray-light">{formatDate(inv.created_at)}</p>
                </div>
                <div className="w-44 flex-shrink-0">
                  <p className="text-[10px] text-brand-gray-light uppercase">Customer</p>
                  <p className="text-xs text-brand-gray-dark">{inv.store_name}</p>
                </div>
                <div className="w-32 flex-shrink-0">
                  <p className="text-[10px] text-brand-gray-light uppercase">Sales</p>
                  <p className="text-xs text-brand-gray-dark">{inv.sales_name}</p>
                </div>
                <div className="w-36 flex-shrink-0">
                  <p className="text-[10px] text-brand-gray-light uppercase">Total</p>
                  <p className="text-sm font-bold text-brand-black">{formatCurrency(inv.total)}</p>
                </div>
                <InvoiceStatusBadge status={inv.invoice_status} />
              </div>
            ))}
            {invoices.length === 0 && <p className="p-8 text-sm text-brand-gray-light text-center">Belum ada invoice.</p>}
          </div>
        </div>
      )}

      {/* Create Purchase Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Buat Purchase Request"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button icon={<Upload className="w-4 h-4" />} disabled={!itemsValid || !invoicePhoto || !supplierId || !forSalesId} onClick={() => setConfirmSubmit(true)}>
              Kirim ke Super Admin
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-3 bg-brand-yellow/10 rounded-xl text-xs text-brand-gray-dark">
            Isi produk, jumlah, dan harga modal. <strong>Foto bukti invoice fisik wajib diunggah</strong> sebelum dikirim ke Super Admin.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Supplier (wajib)"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={activeSuppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.supplier_code})` }))}
              placeholder="Pilih supplier"
            />
            <Select
              label="Ditujukan Untuk Sales (wajib)"
              value={forSalesId}
              onChange={(e) => setForSalesId(e.target.value)}
              options={salesUsers.map((u) => ({ value: u.id, label: u.name }))}
              placeholder="Pilih sales tujuan"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide">Item Pembelian</p>
              <Button size="sm" variant="secondary" icon={<Plus className="w-3 h-3" />} onClick={addItem}>
                Tambah Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="p-4 bg-brand-bg rounded-xl text-center text-xs text-brand-gray-light">
                  Belum ada item. Klik "Tambah Item" untuk mulai.
                </div>
              )}
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 p-3 bg-brand-bg rounded-xl items-end">
                  <div className="col-span-5">
                    <Select
                      label={idx === 0 ? "Produk" : ""}
                      value={it.product_id}
                      onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                      options={products.filter((p) => p.status === "ACTIVE").map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                      placeholder="Pilih produk"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input label={idx === 0 ? "Qty" : ""} type="number" value={String(it.quantity || "")} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} placeholder="0" />
                  </div>
                  <div className="col-span-3">
                    <Input label={idx === 0 ? "Harga Modal" : ""} type="number" value={String(it.cost_price || "")} onChange={(e) => updateItem(idx, { cost_price: Number(e.target.value) })} placeholder="0" hint="Per unit" />
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-gray-light hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="col-span-12 text-right">
                    <p className="text-xs font-bold text-brand-black">{formatCurrency(it.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-3 flex justify-end">
                <p className="text-sm font-bold text-brand-black">Total: {formatCurrency(totalAmount)}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">Bukti Foto Invoice (wajib)</p>
            <label
              className={cn(
                "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center gap-2",
                invoicePhoto ? "border-green-300 bg-green-50" : "border-brand-gray-border hover:border-brand-yellow"
              )}
            >
              {invoicePhoto ? (
                <>
                  <img src={invoicePhoto} alt="bukti" className="max-h-40 rounded-lg border border-brand-gray-border" />
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Foto terunggah â€” klik untuk ganti
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-brand-gray-light" />
                  <p className="text-xs text-brand-gray-mid">Klik untuk upload foto invoice fisik supplier</p>
                  <p className="text-[10px] text-brand-gray-light">JPG / PNG</p>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {!invoicePhoto && <p className="text-[10px] text-red-500 mt-1">Wajib upload bukti foto sebelum submit.</p>}
          </div>

          <Input label="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alasan pembelian / catatan untuk Super Admin" />
        </div>
      </Modal>

      {/* Preview photo */}
      <Modal
        open={previewPhoto}
        onClose={() => setPreviewPhoto(false)}
        title="Bukti Foto Invoice"
        size="md"
        footer={<Button variant="secondary" onClick={() => setPreviewPhoto(false)}>Tutup</Button>}
      >
        {previewSrc ? (
          <img src={previewSrc} alt="Bukti invoice" className="w-full rounded-xl border border-brand-gray-border" />
        ) : (
          <p className="text-sm text-brand-gray-light">Tidak ada foto.</p>
        )}
      </Modal>

      {/* Detail */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={`Detail â€” ${viewTarget?.purchase_code}`}
        size="md"
        footer={<Button variant="secondary" onClick={() => setViewTarget(null)}>Tutup</Button>}
      >
        {viewTarget && (
          <div className="space-y-3 text-sm">
            <div className="bg-brand-bg rounded-xl p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-brand-gray-mid">Status</span>
                <span className="font-bold">{viewTarget.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray-mid">Diajukan</span>
                <span className="font-bold">{viewTarget.requested_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray-mid">Tanggal</span>
                <span className="font-bold">{formatDate(viewTarget.created_at)}</span>
              </div>
              {viewTarget.notes && (
                <div className="flex justify-between">
                  <span className="text-brand-gray-mid">Catatan</span>
                  <span className="font-bold">{viewTarget.notes}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {viewTarget.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-brand-gray-dark">
                    {it.product_name} Ã— {it.quantity}
                  </span>
                  <span className="font-bold">{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-brand-gray-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(viewTarget.total_amount)}</span>
            </div>
            {viewTarget.invoice_url && (
              <div>
                <p className="text-xs font-bold text-brand-gray-mid uppercase mb-2">Bukti Foto</p>
                <img src={viewTarget.invoice_url} alt="bukti" className="max-h-48 rounded-xl border border-brand-gray-border" />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm submit */}
      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={submitPurchase}
        title="Kirim Purchase Request"
        message={`Purchase senilai ${formatCurrency(totalAmount)} dengan ${items.length} item akan dikirim ke Super Admin. Foto bukti terlampir. Lanjutkan?`}
        confirmLabel="Ya, Kirim"
        variant="primary"
      />

      {/* Confirm reject */}
      <ConfirmDialog
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={() => {
          const p = purchases.find((x) => x.id === rejectId);
          if (p) rejectPurchase(p);
        }}
        title="Tolak Purchase Request"
        message="Purchase akan ditolak dan stok tidak berubah. Lanjutkan?"
        confirmLabel="Ya, Tolak"
        variant="danger"
      />
    </div>
  );
}
