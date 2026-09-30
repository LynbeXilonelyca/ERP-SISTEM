"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getInitials } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Plus, Pencil, ShieldAlert } from "lucide-react";
import type { User, Role, Platform } from "@/types";

// Catatan: akun baru yang dibuat di halaman ini tercermin di dashboard/statistik, namun login demo tetap memakai akun seed (lib/auth.tsx & lib/seed.ts).

type Draft = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  allowed_platform: Platform;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
};

const roleOptions: { value: Role; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "SALES", label: "Sales" },
  { value: "SALES_ADMIN", label: "Sales Admin" },
  { value: "SHIPPING_ADMIN", label: "Shipping Admin" },
  { value: "FINANCE", label: "Finance" },
  { value: "PURCHASE_ADMIN", label: "Purchase Admin" },
];

const platformLabels: Record<Platform, string> = {
  WEB: "Web",
  MOBILE: "Mobile",
  BOTH: "Web & Mobile",
};

const platformColors: Record<string, string> = {
  WEB: "bg-blue-50 text-blue-700",
  MOBILE: "bg-purple-50 text-purple-700",
  BOTH: "bg-green-50 text-green-700",
};

export default function UsersPage() {
  const { users, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const isManage = hasRole("SUPER_ADMIN");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<Draft>({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "SALES",
    allowed_platform: "WEB",
    status: "ACTIVE",
    created_at: "",
  });

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing(null);
    setFormError("");
    setDraft({
      id: `u${Date.now()}`,
      name: "",
      email: "",
      phone: "",
      role: "SALES",
      allowed_platform: "WEB",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setFormError("");
    setDraft({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      allowed_platform: u.allowed_platform,
      status: u.status,
      created_at: u.created_at,
    });
    setShowForm(true);
  };

  const save = () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      setFormError("Nama dan Email wajib diisi.");
      return;
    }
    const normalized = draft.email.trim().toLowerCase();
    const duplicate = users.some(
      (u) => u.email.toLowerCase() === normalized && u.id !== (editing?.id ?? "")
    );
    if (duplicate) {
      setFormError("Email sudah digunakan oleh user lain.");
      return;
    }
    const now = new Date().toISOString();
    const data: User = {
      id: editing?.id ?? draft.id,
      name: draft.name.trim(),
      email: normalized,
      phone: draft.phone.trim(),
      role: draft.role,
      allowed_platform: draft.allowed_platform,
      status: draft.status,
      created_at: editing?.created_at ?? now,
      updated_at: now,
    };
    setDB((db) => ({
      ...db,
      users: editing
        ? db.users.map((u) => (u.id === editing.id ? data : u))
        : [...db.users, data],
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: editing ? "UPDATE" : "CREATE",
      module: "USER",
      record_id: data.email,
      old_value: editing ? `role: ${editing.role} Â· status: ${editing.status}` : "NONE",
      new_value: `role: ${data.role} Â· status: ${data.status}`,
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: editing ? "User Diperbarui" : "User Ditambahkan",
      message: `${data.name} tersimpan.`,
      type: "SUCCESS",
    });
    setFormError("");
    setShowForm(false);
  };

  const columns = [
    {
      key: "name",
      label: "User",
      render: (_: unknown, row: typeof paginated[0]) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand-black">{getInitials(row.name)}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-brand-black">{row.name}</p>
            <p className="text-[10px] text-brand-gray-light">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (v: unknown) => <RoleBadge role={String(v)} />,
    },
    {
      key: "allowed_platform",
      label: "Platform",
      render: (v: unknown) => (
        <span className={`badge text-[10px] ${platformColors[String(v)]}`}>
          {platformLabels[String(v) as Platform] ?? String(v)}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Telepon",
      render: (v: unknown) => (
        <span className="text-xs text-brand-gray-dark">{String(v || "â€”")}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => (
        <Badge variant={v === "ACTIVE" ? "success" : "gray"}>{String(v)}</Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: typeof paginated[0]) =>
        isManage ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-brand-gray-light">â€”</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "User Management" }]}
        actions={
          isManage ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
              Tambah User
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{users.length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total User</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.status === "ACTIVE").length}
          </p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Aktif</p>
        </div>
        <div className="card py-3 bg-brand-yellow/10">
          <p className="text-2xl font-bold text-brand-black">
            {users.filter((u) => u.status === "INACTIVE").length}
          </p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Nonaktif</p>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {roleOptions.map((r) => {
          const count = users.filter((u) => u.role === r.value).length;
          return (
            <div
              key={r.value}
              className="card py-3 text-center cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => setRoleFilter(r.value === roleFilter ? "" : r.value)}
            >
              <p className="text-2xl font-bold text-brand-black">{count}</p>
              <p className="text-[10px] text-brand-gray-mid mt-0.5">{r.label}</p>
            </div>
          );
        })}
      </div>

      <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-brand-black mt-0.5 flex-shrink-0" />
          <div className="text-xs text-brand-gray-dark">
            <strong className="text-brand-black">Aturan Platform:</strong> Sales hanya bisa login di Mobile App.
            Admin/Finance/Super Admin hanya di Web. Pembatasan dilakukan dari backend API, bukan dari UI.
            Saat user dinonaktifkan, semua session langsung di-revoke.
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / email..." className="w-56" />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={roleOptions}
            placeholder="Semua Role"
            className="w-44"
          />
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
          {(search || roleFilter || statusFilter) && (
            <button
              className="text-xs text-brand-gray-mid hover:text-brand-black"
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setStatusFilter("");
              }}
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} user</span>
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit User" : "Tambah User"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={!draft.name.trim() || !draft.email.trim()} onClick={save}>
              {editing ? "Simpan Perubahan" : "Tambah User"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama (wajib)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nama user"
          />
          <Input
            label="Email (wajib)"
            type="email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="email@company.com"
          />
          <Input
            label="No. Telepon"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
          <Select
            label="Role"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
            options={roleOptions}
          />
          <div>
            <Select
              label="Platform"
              value={draft.allowed_platform}
              onChange={(e) =>
                setDraft({ ...draft, allowed_platform: e.target.value as Platform })
              }
              options={[
                { value: "WEB", label: "Web" },
                { value: "MOBILE", label: "Mobile" },
                { value: "BOTH", label: "Web & Mobile" },
              ]}
            />
            <p className="text-xs text-brand-gray-light mt-1">Sales â†’ Mobile Only. Admin/Finance â†’ Web Only.</p>
          </div>
          <Select
            label="Status"
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as "ACTIVE" | "INACTIVE" })
            }
            options={[
              { value: "ACTIVE", label: "Aktif" },
              { value: "INACTIVE", label: "Nonaktif" },
            ]}
          />
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
