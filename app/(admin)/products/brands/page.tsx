"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, Pencil, Star, Trash2 } from "lucide-react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type { Brand } from "@/types";

export default function BrandsPage() {
  const { brands, products, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const isManage = hasRole("SUPER_ADMIN") || hasRole("SALES_ADMIN") || hasRole("PURCHASE_ADMIN");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setShowForm(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setName(b.name);
    setShowForm(true);
  };

  const save = () => {
    if (!name.trim()) return;
    const brandName = name.trim();
    if (editing) {
      setDB((db) => ({
        ...db,
        brands: db.brands.map((b) => (b.id === editing.id ? { ...b, name: brandName } : b)),
        products: db.products.map((p) =>
          p.brand_id === editing.id ? { ...p, brand_name: brandName } : p
        ),
      }));
      addAudit({
        user_name: user?.name ?? "Super Admin",
        user_role: user?.role ?? "SUPER_ADMIN",
        action: "UPDATE",
        module: "BRAND",
        record_id: editing.id,
        old_value: editing.name,
        new_value: brandName,
        ip_address: "local",
        device: "Web",
      });
      notify({ title: "Brand Diperbarui", message: `${brandName} tersimpan.`, type: "SUCCESS" });
    } else {
      const b: Brand = { id: `b${Date.now()}`, name: brandName };
      setDB((db) => ({ ...db, brands: [...db.brands, b] }));
      addAudit({
        user_name: user?.name ?? "Super Admin",
        user_role: user?.role ?? "SUPER_ADMIN",
        action: "CREATE",
        module: "BRAND",
        record_id: b.id,
        old_value: "NONE",
        new_value: brandName,
        ip_address: "local",
        device: "Web",
      });
      notify({ title: "Brand Ditambahkan", message: `${brandName} tersimpan.`, type: "SUCCESS" });
    }
    setShowForm(false);
  };

  const remove = (b: Brand) => {
    setDB((db) => ({
      ...db,
      brands: db.brands.filter((x) => x.id !== b.id),
      products: db.products.map((p) =>
        p.brand_id === b.id ? { ...p, brand_id: "", brand_name: "â€”" } : p
      ),
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "DELETE",
      module: "BRAND",
      record_id: b.id,
      old_value: b.name,
      new_value: "NONE",
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Brand Dihapus", message: `${b.name} dihapus. Produk terpengaruh direset brand.`, type: "INFO" });
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Brands"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Product", href: "/products" }, { label: "Brands" }]}
        actions={
          isManage ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
              Tambah Brand
            </Button>
          ) : undefined
        }
      />

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {brands.length === 0 && (
            <p className="text-sm text-brand-gray-light py-8 text-center col-span-full">Belum ada brand.</p>
          )}
          {brands.map((b) => {
            const count = products.filter((p) => p.brand_id === b.id).length;
            const own = products.filter((p) => p.brand_id === b.id && p.is_own_brand).length;
            return (
              <div key={b.id} className="border border-brand-gray-border rounded-xl p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-brand-yellow/30 flex items-center justify-center font-bold text-brand-black">
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-black">{b.name}</p>
                      <p className="text-[10px] text-brand-gray-light">{count} produk</p>
                    </div>
                  </div>
                  {isManage && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-gray-mid hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {own > 0 && (
                  <Badge variant="yellow" className="mt-1">
                    <Star className="w-3 h-3" /> {own} Own Brand
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Brand" : "Tambah Brand"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={!name.trim()} onClick={save}>Simpan</Button>
          </>
        }
      >
        <Input label="Nama Brand" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama brand" autoFocus />
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Hapus Brand"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="danger" onClick={() => confirmDelete && remove(confirmDelete)}>
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray-dark">
          Brand <strong>{confirmDelete?.name}</strong> akan dihapus. Produk yang memakai brand ini akan kehilangan brand.
          Lanjutkan?
        </p>
      </Modal>
    </div>
  );
}
