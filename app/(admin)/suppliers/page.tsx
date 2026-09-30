"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Input, Textarea } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Plus, Pencil, Phone, Trash2 } from "lucide-react";
import type { Supplier as SupplierType } from "@/types";

type Draft = {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
};

export default function SuppliersPage() {
  const { suppliers, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const isManage = hasRole("SUPER_ADMIN") || hasRole("PURCHASE_ADMIN");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SupplierType | null>(null);
  const [draft, setDraft] = useState<Draft>({ id: "", supplier_code: "", name: "", contact_person: "", phone: "", email: "", address: "", status: "ACTIVE", created_at: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.supplier_code.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [suppliers, search, statusFilter]);

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing(null);
    setDraft({ id: `sp${Date.now()}`, supplier_code: `SUP-${String(suppliers.length + 1).padStart(3, "0")}`, name: "", contact_person: "", phone: "", email: "", address: "", status: "ACTIVE", created_at: new Date().toISOString() });
    setShowForm(true);
  };

  const openEdit = (s: SupplierType) => {
    setEditing(s);
    setDraft({ id: s.id, supplier_code: s.supplier_code, name: s.name, contact_person: s.contact_person, phone: s.phone, email: s.email ?? "", address: s.address ?? "", status: s.status, created_at: s.created_at });
    setShowForm(true);
  };

  const save = () => {
    if (!draft.name || !draft.contact_person || !draft.phone) return;
    const data: SupplierType = {
      id: draft.id,
      supplier_code: draft.supplier_code,
      name: draft.name,
      contact_person: draft.contact_person,
      phone: draft.phone,
      email: draft.email || undefined,
      address: draft.address || undefined,
      status: draft.status,
      created_at: draft.created_at,
    };
    setDB((db) => ({
      ...db,
      suppliers: editing ? db.suppliers.map((s) => (s.id === editing.id ? data : s)) : [...db.suppliers, data],
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: editing ? "UPDATE" : "CREATE",
      module: "SUPPLIER",
      record_id: data.supplier_code,
      old_value: editing ? "EXISTS" : "NONE",
      new_value: data.name,
      ip_address: "local",
      device: "Web",
    });
    notify({ title: editing ? "Supplier Diperbarui" : "Supplier Ditambahkan", message: `${data.name} tersimpan.`, type: "SUCCESS" });
    setShowForm(false);
  };

  const remove = (s: SupplierType) => {
    setDB((db) => ({ ...db, suppliers: db.suppliers.filter((x) => x.id !== s.id) }));
    notify({ title: "Supplier Dihapus", message: `${s.name} dihapus.`, type: "INFO" });
    setConfirmDelete(null);
  };

  const columns = [
    {
      key: "supplier_code",
      label: "Supplier",
      render: (_: unknown, row: typeof paginated[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.supplier_code} Â· {row.contact_person}</p>
        </div>
      ),
    },
    { key: "phone", label: "Kontak", render: (v: unknown, row: typeof paginated[0]) => (
      <div>
        <p className="text-xs text-brand-gray-dark">{String(v)}</p>
        {row.email && <p className="text-[10px] text-brand-gray-light">{row.email}</p>}
      </div>
    ) },
    { key: "address", label: "Alamat", render: (v: unknown) => <span className="text-xs text-brand-gray-dark truncate block max-w-[220px]">{String(v || "â€”")}</span> },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <Badge variant={v === "ACTIVE" ? "success" : "gray"}>{String(v)}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: typeof paginated[0]) =>
        isManage ? (
          <div className="flex items-center gap-1">
            <a href={`tel:${row.phone}`} className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors">
              <Phone className="w-3.5 h-3.5" />
            </a>
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setConfirmDelete(row.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-gray-mid hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-brand-gray-light">Lihat</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Suppliers" }]}
        actions={
          isManage ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
              Tambah Supplier
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{suppliers.length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Supplier</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-green-600">{suppliers.filter((s) => s.status === "ACTIVE").length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Aktif</p>
        </div>
        <div className="card py-3 bg-brand-yellow/10">
          <p className="text-2xl font-bold text-brand-black">{suppliers.filter((s) => s.status === "INACTIVE").length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Nonaktif</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / kode / kontak..." className="w-64" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "ACTIVE", label: "Aktif" },
              { value: "INACTIVE", label: "Nonaktif" },
            ]}
            placeholder="Semua Status"
            className="w-36"
          />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} supplier</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={(paginated as unknown as Record<string, unknown>[])}
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Supplier" : "Tambah Supplier"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={!draft.name || !draft.contact_person || !draft.phone} onClick={save}>
              {editing ? "Simpan Perubahan" : "Tambah Supplier"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Kode Supplier" value={draft.supplier_code} onChange={(e) => setDraft({ ...draft, supplier_code: e.target.value })} />
          <Input label="Nama Supplier (wajib)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input label="Nama Kontak (wajib)" value={draft.contact_person} onChange={(e) => setDraft({ ...draft, contact_person: e.target.value })} />
          <Input label="No. HP (wajib)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <Input label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <Select
            label="Status"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as "ACTIVE" | "INACTIVE" })}
            options={[
              { value: "ACTIVE", label: "Aktif" },
              { value: "INACTIVE", label: "Nonaktif" },
            ]}
          />
          <div className="col-span-2">
            <Textarea label="Alamat" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="min-h-[70px]" />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Hapus Supplier"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="danger" onClick={() => {
              const s = suppliers.find((x) => x.id === confirmDelete);
              if (s) remove(s);
            }}>
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray-dark">Supplier ini akan dihapus permanen. Lanjutkan?</p>
      </Modal>
    </div>
  );
}
