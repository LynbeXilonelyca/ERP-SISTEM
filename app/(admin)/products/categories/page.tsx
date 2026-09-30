"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { categories, products, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const isManage = hasRole("SUPER_ADMIN") || hasRole("SALES_ADMIN") || hasRole("PURCHASE_ADMIN");

  const [expanded, setExpanded] = useState<string[]>(categories.map((c) => c.id));
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [subFor, setSubFor] = useState<Category | null>(null);
  const [subName, setSubName] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<{ cat: Category; subId: string; subName: string } | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const catCount = (id: string) => products.filter((p) => p.category_id === id).length;
  const subCount = (catId: string, subId: string) =>
    products.filter((p) => p.category_id === catId && p.sub_category_id === subId).length;

  const saveCategory = () => {
    if (!newName.trim()) return;
    const cat: Category = { id: `c${Date.now()}`, name: newName.trim(), sub_categories: [] };
    setDB((db) => ({ ...db, categories: [...db.categories, cat] }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "CREATE",
      module: "CATEGORY",
      record_id: cat.id,
      old_value: "NONE",
      new_value: cat.name,
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Kategori Ditambahkan", message: `${cat.name} tersimpan.`, type: "SUCCESS" });
    setNewName("");
    setAddModal(false);
    setExpanded((prev) => [...prev, cat.id]);
  };

  const saveSub = () => {
    if (!subFor || !subName.trim()) return;
    const sub = { id: `sc${Date.now()}`, name: subName.trim(), category_id: subFor.id };
    setDB((db) => ({
      ...db,
      categories: db.categories.map((c) =>
        c.id === subFor.id ? { ...c, sub_categories: [...c.sub_categories, sub] } : c
      ),
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "CREATE",
      module: "CATEGORY",
      record_id: sub.id,
      old_value: "NONE",
      new_value: sub.name,
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Sub Kategori Ditambahkan", message: `${sub.name} ditambahkan ke ${subFor.name}.`, type: "SUCCESS" });
    setSubName("");
    setSubFor(null);
  };

  const deleteCategory = (cat: Category) => {
    setDB((db) => ({
      ...db,
      categories: db.categories.filter((c) => c.id !== cat.id),
      products: db.products.map((p) =>
        p.category_id === cat.id
          ? { ...p, category_id: "", category_name: "â€”", sub_category_id: "", sub_category_name: "â€”" }
          : p
      ),
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "DELETE",
      module: "CATEGORY",
      record_id: cat.id,
      old_value: cat.name,
      new_value: "NONE",
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Kategori Dihapus", message: `${cat.name} dan sub-kategorinya dihapus.`, type: "INFO" });
    setConfirmDeleteCat(null);
  };

  const deleteSub = (cat: Category, subId: string, subName: string) => {
    setDB((db) => ({
      ...db,
      categories: db.categories.map((c) =>
        c.id === cat.id
          ? { ...c, sub_categories: c.sub_categories.filter((s) => s.id !== subId) }
          : c
      ),
      products: db.products.map((p) =>
        p.sub_category_id === subId
          ? { ...p, sub_category_id: "", sub_category_name: "â€”" }
          : p
      ),
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "DELETE",
      module: "CATEGORY",
      record_id: subId,
      old_value: subName,
      new_value: "NONE",
      ip_address: "local",
      device: "Web",
    });
    notify({ title: "Sub Kategori Dihapus", message: `${subName} dihapus.`, type: "INFO" });
    setConfirmDeleteSub(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Product", href: "/products" }, { label: "Categories" }]}
        actions={
          isManage ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>
              Tambah Kategori
            </Button>
          ) : undefined
        }
      />

      <div className="card">
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-sm text-brand-gray-light py-8 text-center">Belum ada kategori.</p>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="border border-brand-gray-border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-brand-bg cursor-pointer hover:bg-brand-yellow/10 transition-colors"
                onClick={() => toggle(cat.id)}
              >
                <div className="flex items-center gap-3">
                  {expanded.includes(cat.id) ? (
                    <ChevronDown className="w-4 h-4 text-brand-gray-mid" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-brand-gray-mid" />
                  )}
                  <p className="text-sm font-bold text-brand-black">{cat.name}</p>
                  <Badge variant="gray">{catCount(cat.id)} produk</Badge>
                </div>
                {isManage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-brand-gray-mid hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {expanded.includes(cat.id) && (
                <div className="divide-y divide-brand-gray-border">
                  {cat.sub_categories.length === 0 && (
                    <p className="px-6 py-2.5 text-xs text-brand-gray-light">Belum ada sub kategori.</p>
                  )}
                  {cat.sub_categories.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-6 py-2.5 hover:bg-brand-bg transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                        <p className="text-sm text-brand-black">{sub.name}</p>
                        <span className="text-xs text-brand-gray-light">
                          ({subCount(cat.id, sub.id)} produk)
                        </span>
                      </div>
                      {isManage && (
                        <button
                          onClick={() => setConfirmDeleteSub({ cat, subId: sub.id, subName: sub.name })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-brand-gray-mid hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {isManage && (
                    <div className="px-6 py-2.5">
                      <button
                        className="text-xs text-brand-gray-mid hover:text-brand-black flex items-center gap-1 transition-colors"
                        onClick={() => { setSubFor(cat); setSubName(""); }}
                      >
                        <Plus className="w-3 h-3" /> Tambah Sub Kategori
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Tambah Kategori"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Batal</Button>
            <Button disabled={!newName.trim()} onClick={saveCategory}>Simpan</Button>
          </>
        }
      >
        <Input
          label="Nama Kategori"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama kategori baru"
          autoFocus
        />
      </Modal>

      {/* Add Sub Category Modal */}
      <Modal
        open={!!subFor}
        onClose={() => setSubFor(null)}
        title={`Tambah Sub Kategori â€” ${subFor?.name ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubFor(null)}>Batal</Button>
            <Button disabled={!subName.trim()} onClick={saveSub}>Simpan</Button>
          </>
        }
      >
        <Input
          label="Nama Sub Kategori"
          value={subName}
          onChange={(e) => setSubName(e.target.value)}
          placeholder="Nama sub kategori baru"
          autoFocus
        />
      </Modal>

      {/* Delete Category Confirm */}
      <Modal
        open={!!confirmDeleteCat}
        onClose={() => setConfirmDeleteCat(null)}
        title="Hapus Kategori"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteCat(null)}>Batal</Button>
            <Button variant="danger" onClick={() => confirmDeleteCat && deleteCategory(confirmDeleteCat)}>
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray-dark">
          Kategori <strong>{confirmDeleteCat?.name}</strong> beserta semua sub-kategorinya akan dihapus.
          Produk yang memakainya akan kehilangan kategori. Lanjutkan?
        </p>
      </Modal>

      {/* Delete Sub Category Confirm */}
      <Modal
        open={!!confirmDeleteSub}
        onClose={() => setConfirmDeleteSub(null)}
        title="Hapus Sub Kategori"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteSub(null)}>Batal</Button>
            <Button
              variant="danger"
              onClick={() => confirmDeleteSub && deleteSub(confirmDeleteSub.cat, confirmDeleteSub.subId, confirmDeleteSub.subName)}
            >
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray-dark">
          Sub kategori <strong>{confirmDeleteSub?.subName}</strong> akan dihapus.
          Produk yang memakainya akan kehilangan sub kategori. Lanjutkan?
        </p>
      </Modal>
    </div>
  );
}
