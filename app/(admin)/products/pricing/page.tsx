"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { cn, formatCurrency, marginInfo } from "@/lib/utils";
import { Pencil, History, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const TERM_ORDER = ["Cash", "1 Hari", "1 Minggu", "1 Bulan", "3 Bulan"];

export default function PricingPage() {
  const { products, price_change_requests, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [newPrices, setNewPrices] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const canEditDirect = hasRole("SUPER_ADMIN") || hasRole("PURCHASE_ADMIN");
  const pendingCount = price_change_requests.filter((r) => r.status === "PENDING").length;

  const filtered = products.filter(
    (p) => p.status === "ACTIVE" && (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedProduct = selected ? products.find((p) => p.id === selected) ?? null : null;

  const priceFor = (p: (typeof products)[number], termLabel: string) =>
    p.prices.find((x) => x.payment_term_label === termLabel)?.price ?? 0;

  const openEdit = (p: (typeof products)[number]) => {
    setSelected(p.id);
    const map: Record<string, number> = {};
    p.prices.forEach((x) => (map[x.payment_term_id] = x.price));
    setNewPrices(map);
    setNotes("");
    setEditModal(true);
  };

  const getChanged = () => {
    if (!selectedProduct) return [];
    const changed: { pid: string; label: string; old_price: number; new_price: number }[] = [];
    selectedProduct.prices.forEach((x) => {
      const np = newPrices[x.payment_term_id];
      if (np !== undefined && np !== x.price) {
        changed.push({ pid: x.payment_term_id, label: x.payment_term_label, old_price: x.price, new_price: np });
      }
    });
    return changed;
  };

  const saveDirect = () => {
    if (!selectedProduct) return;
    const changed = getChanged();
    if (changed.length === 0) {
      setEditModal(false);
      return;
    }
    setDB((db) => ({
      ...db,
      products: db.products.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              prices: p.prices.map((x) => {
                const match = changed.find((c) => c.pid === x.payment_term_id);
                return match ? { ...x, price: match.new_price, effective_from: new Date().toISOString() } : x;
              }),
            }
          : p
      ),
    }));
    changed.forEach((c) =>
      addAudit({
        user_name: user?.name ?? "System",
        user_role: user?.role ?? "SUPER_ADMIN",
        action: "UPDATE",
        module: "PRICE",
        record_id: selectedProduct.sku,
        old_value: String(c.old_price),
        new_value: String(c.new_price),
        ip_address: "local",
        device: "Web",
      })
    );
    notify({ title: "Harga Diperbarui", message: `${selectedProduct.name}: ${changed.length} harga langsung berlaku.`, type: "SUCCESS" });
    setEditModal(false);
  };

  const requestChange = () => {
    if (!selectedProduct) return;
    const changed = getChanged();
    if (changed.length === 0) {
      setEditModal(false);
      return;
    }
    const now = new Date().toISOString();
    setDB((db) => ({
      ...db,
      price_change_requests: [
        ...db.price_change_requests,
        ...changed.map((c) => ({
          id: `pcr${Date.now()}-${c.pid}`,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          sku: selectedProduct.sku,
          payment_term_id: c.pid,
          payment_term_label: c.label,
          old_price: c.old_price,
          new_price: c.new_price,
          requested_by: user?.id ?? "",
          requested_by_name: user?.name ?? "",
          requested_by_role: user?.role ?? "SALES_ADMIN",
          status: "PENDING" as const,
          notes,
          created_at: now,
        })),
      ],
    }));
    notify({
      title: "Permintaan Ubah Harga Dikirim",
      message: `${selectedProduct.name}: ${changed.length} harga dikirim untuk persetujuan Super Admin.`,
      type: "INFO",
      target_role: "SUPER_ADMIN",
    });
    setEditModal(false);
  };

  const terms = TERM_ORDER;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pricing"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Product", href: "/products" }, { label: "Pricing" }]}
        actions={
          <Button variant="secondary" icon={<History className="w-4 h-4" />} onClick={() => (window.location.href = "/products/price-history")}>
            Lihat Price History
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{products.filter((p) => p.status === "ACTIVE").length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Produk Aktif</p>
        </div>
        <div className="card py-3">
          <p className={"text-2xl font-bold " + (pendingCount > 0 ? "text-orange-600" : "text-brand-black")}>{pendingCount}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Menunggu Persetujuan Harga</p>
        </div>
        <div className="card py-3 bg-brand-yellow/10">
          <p className="text-2xl font-bold text-brand-black">{canEditDirect ? "Langsung" : "Perlu Approve"}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Mode Ubah Harga</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-border flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari produk..." className="w-64" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} produk</span>
        </div>

        {/* Info banner */}
        <div className="mx-4 mt-4 mb-0 p-3 bg-brand-yellow/10 rounded-xl text-xs text-brand-gray-dark">
          <strong>Aturan Harga:</strong>{" "}
          {canEditDirect ? (
            <span>
              Anda (<strong>{user?.role.replace(/_/g, " ")}</strong>) dapat mengubah harga <span className="text-green-600 font-semibold">langsung berlaku</span>. Role lain harus minta persetujuan Super Admin dahulu.
            </span>
          ) : (
            <span>
              Anda dapat mengajukan perubahan harga, lalu <span className="text-orange-600 font-semibold">menunggu persetujuan Super Admin</span> sebelum berlaku. Invoice lama tidak ikut berubah.
            </span>
          )}
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-brand-gray-border">
                <th className="table-head text-left py-3 px-3 bg-brand-bg">Produk</th>
                <th className="table-head text-left py-3 px-3 bg-brand-bg">Harga Modal</th>
                {terms.map((t) => (
                  <th key={t} className="table-head text-left py-3 px-3 bg-brand-bg">{t}</th>
                ))}
                <th className="table-head py-3 px-3 bg-brand-bg"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-brand-gray-border hover:bg-brand-bg transition-colors">
                  <td className="py-3 px-3">
                    <p className="text-xs font-semibold text-brand-black">{p.name}</p>
                    <p className="text-[10px] text-brand-gray-light">{p.sku}</p>
                    {p.is_own_brand && <Badge variant="yellow" className="mt-1">Own Brand</Badge>}
                  </td>
                  <td className="py-3 px-3 text-xs font-semibold text-brand-gray-mid">
                    {formatCurrency(p.cost_price)}
                  </td>
                  {terms.map((t) => {
                    const price = priceFor(p, t);
                    const mi = marginInfo(price, p.cost_price);
                    return (
                      <td key={t} className="py-3 px-3">
                        <p className="text-xs font-semibold text-brand-black">{price ? formatCurrency(price) : "â€”"}</p>
                        {price && (
                          <p className={cn("text-[10px] font-semibold", mi.level === "danger" ? "text-red-500" : mi.level === "warning" ? "text-orange-500" : "text-green-600")}>
                            {mi.marginPct.toFixed(0)}% {mi.level === "danger" ? "â€” rugi!" : mi.level === "warning" ? "â€” < 8%" : ""}
                          </p>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Price Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={`Edit Harga â€” ${selectedProduct?.name}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(false)}>Batal</Button>
            {canEditDirect ? (
              <Button onClick={saveDirect}>Simpan Harga (Langsung)</Button>
            ) : (
              <Button icon={<Send className="w-4 h-4" />} onClick={requestChange} disabled={getChanged().length === 0}>
                Kirim ke Super Admin
              </Button>
            )}
          </>
        }
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="p-3 bg-brand-bg rounded-xl text-xs text-brand-gray-dark">
              Harga modal: <strong>{formatCurrency(selectedProduct.cost_price)}</strong>
              {!canEditDirect && (
                <span className="block text-orange-600 mt-1">
                  Anda mengajukan perubahan â€” Super Admin harus menyetujui dahulu.
                </span>
              )}
            </div>
            <div className="space-y-3">
              {selectedProduct.prices.map((x) => {
                const np = newPrices[x.payment_term_id];
                const eff = np ?? x.price;
                const mi = marginInfo(eff, selectedProduct.cost_price);
                const changed = np !== undefined && np !== x.price;
                return (
                  <div key={x.payment_term_id} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-brand-gray-dark w-32 flex-shrink-0">{x.payment_term_label}</span>
                      <input
                        type="number"
                        className="form-input flex-1"
                        value={np ?? ""}
                        onChange={(e) => {
                          const updated = { ...newPrices };
                          updated[x.payment_term_id] = Number(e.target.value);
                          setNewPrices(updated);
                        }}
                      />
                      <span className={cn("text-xs w-28 flex-shrink-0 font-semibold", mi.level === "danger" ? "text-red-500" : mi.level === "warning" ? "text-orange-500" : "text-green-600")}>
                        {changed && `Rp ${x.price.toLocaleString("id-ID")} â†’ `}margin {mi.marginPct.toFixed(1)}%
                      </span>
                    </div>
                    {(mi.level === "danger" || mi.level === "warning") && (
                      <p className={cn("text-[10px] font-semibold", mi.level === "danger" ? "text-red-500" : "text-orange-500")}>
                        âš  {mi.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {!canEditDirect && (
              <input
                className="form-input w-full"
                placeholder="Catatan / alasan perubahan harga (opsional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
            <p className="text-xs text-brand-gray-light">
              Perubahan harga akan dicatat di price history. Invoice yang sudah dibuat tidak akan berubah.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
