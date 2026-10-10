"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Plus, Truck, User, Users as UsersIcon, Pencil, Route as RouteIcon } from "lucide-react";
import type { Employee, EmployeeType, ShippingRoute } from "@/types";

export default function EmployeesPage() {
  const { employees, shipping_routes, setDB, notify, addAudit } = useData();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: "",
    employee_type: "SUPER" as EmployeeType,
    phone: "",
    route: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [showRoute, setShowRoute] = useState(false);
  const [routeEditing, setRouteEditing] = useState<ShippingRoute | null>(null);
  const [routeForm, setRouteForm] = useState({
    name: "",
    status: "OPEN" as "OPEN" | "CLOSED",
    closed_reason: "",
  });

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q || e.name.toLowerCase().includes(q) || e.route.toLowerCase().includes(q) || e.phone.includes(q);
        const matchType = !typeFilter || e.employee_type === typeFilter;
        return matchSearch && matchType;
      }),
    [employees, search, typeFilter]
  );

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", employee_type: "SUPER", phone: "", route: "", status: "ACTIVE" });
    setShowForm(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      name: e.name,
      employee_type: e.employee_type,
      phone: e.phone,
      route: e.route,
      status: e.status,
    });
    setShowForm(true);
  };

  const save = () => {
    if (!form.name) return;
    const emp: Employee = {
      id: editing?.id ?? `emp${Date.now()}`,
      name: form.name,
      employee_type: form.employee_type,
      phone: form.phone,
      route: form.route,
      status: form.status,
      created_at: editing?.created_at ?? new Date().toISOString(),
    };
    setDB((db) => ({
      ...db,
      employees: editing ? db.employees.map((x) => (x.id === editing.id ? emp : x)) : [...db.employees, emp],
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: editing ? "UPDATE" : "CREATE",
      module: "EMPLOYEE",
      record_id: emp.name,
      old_value: editing ? "EXISTS" : "NONE",
      new_value: form.employee_type === "SUPER" ? "SUPIR" : "KENEK",
      ip_address: "local",
      device: "Web",
    });
    notify({ title: editing ? "Karyawan Diperbarui" : "Karyawan Ditambahkan", message: `${emp.name} tersimpan.`, type: "SUCCESS" });
    setShowForm(false);
  };

  const saveRoute = () => {
    if (!routeForm.name) return;
    const r: ShippingRoute = {
      id: routeEditing?.id ?? `r${Date.now()}`,
      name: routeForm.name,
      status: routeForm.status,
      closed_reason: routeForm.status === "CLOSED" ? routeForm.closed_reason || "Jalur ditutup" : undefined,
      created_at: routeEditing?.created_at ?? new Date().toISOString(),
    };
    setDB((db) => ({
      ...db,
      shipping_routes: routeEditing ? db.shipping_routes.map((x) => (x.id === routeEditing.id ? r : x)) : [...db.shipping_routes, r],
    }));
    notify({ title: "Jalur Disimpan", message: `Jalur ${r.name} ${r.status === "CLOSED" ? "ditutup" : "dibuka"}.`, type: "SUCCESS" });
    setShowRoute(false);
    setRouteForm({ name: "", status: "OPEN", closed_reason: "" });
  };

  const columns = [
    {
      key: "name",
      label: "Nama",
      render: (_: unknown, row: Employee) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-yellow/30 flex items-center justify-center flex-shrink-0">
            {row.employee_type === "SUPER" ? <Truck className="w-4 h-4 text-brand-black" /> : <User className="w-4 h-4 text-brand-gray-mid" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-brand-black">{row.name}</p>
            <p className="text-[10px] text-brand-gray-light">{row.phone || "-"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "employee_type",
      label: "Tipe",
      render: (v: unknown) => (
        <Badge variant={v === "SUPER" ? "info" : "default"}>{v === "SUPER" ? "Supir" : "Kenek"}</Badge>
      ),
    },
    {
      key: "route",
      label: "Jalur",
      render: (_: unknown, row: Employee) => {
        const route = shipping_routes.find((r) => r.name === row.route);
        return (
          <div className="flex items-center gap-1.5">
            <RouteIcon className="w-3 h-3 text-brand-gray-light" />
            <span className="text-xs text-brand-gray-dark">{row.route || "—"}</span>
            {route && route.status === "CLOSED" && <Badge variant="danger">Tutup</Badge>}
          </div>
        );
      },
    },
    {
      key: "created_at",
      label: "Tanggal",
      render: (v: unknown) => <span className="text-xs text-brand-gray-mid">{formatDate(String(v))}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <Badge variant={v === "ACTIVE" ? "success" : "gray"}>{String(v)}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: Employee) => (
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Karyawan"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Karyawan" }]}
        actions={
          <>
            <Button variant="secondary" icon={<RouteIcon className="w-4 h-4" />} onClick={() => { setRouteEditing(null); setRouteForm({ name: "", status: "OPEN", closed_reason: "" }); setShowRoute(true); }}>
              Atur Jalur
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
              Tambah Karyawan
            </Button>
          </>
        }
      />

      {/* Jalur aktif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {shipping_routes.map((r) => (
          <button
            key={r.id}
            onClick={() => { setRouteEditing(r); setRouteForm({ name: r.name, status: r.status, closed_reason: r.closed_reason ?? "" }); setShowRoute(true); }}
            className={`card text-left p-3 transition-all ${r.status === "CLOSED" ? "bg-red-50" : "bg-white"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5" /> {r.name}
              </p>
              <Badge variant={r.status === "OPEN" ? "success" : "danger"}>{r.status === "OPEN" ? "Buka" : "Tutup"}</Badge>
            </div>
            {r.closed_reason && <p className="text-[10px] text-red-500 mt-1">{r.closed_reason}</p>}
            <p className="text-[10px] text-brand-gray-light mt-1">
              {employees.filter((e) => e.route === r.name).length} karyawan
            </p>
          </button>
        ))}
        {shipping_routes.length === 0 && (
          <div className="card p-3 text-xs text-brand-gray-light col-span-full">
            Belum ada jalur. Klik &quot;Atur Jalur&quot; untuk mendaftar jalur pengiriman.
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari karyawan / jalur..." className="w-56" />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: "SUPER", label: "Supir" },
              { value: "KENEK", label: "Kenek" },
            ]}
            placeholder="Semua Tipe"
            className="w-36"
          />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} karyawan</span>
        </div>
        <Table columns={columns as Parameters<typeof Table>[0]["columns"]} data={paginated as unknown as Record<string, unknown>[]} rowKey="id" />
        {filtered.length > perPage && (
          <div className="p-4 border-t border-brand-gray-border">
            <Pagination currentPage={page} totalPages={Math.ceil(filtered.length / perPage)} total={filtered.length} perPage={perPage} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Modal Karyawan */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Karyawan" : "Tambah Karyawan"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={!form.name} onClick={save}>{editing ? "Simpan" : "Tambah"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
          <Select
            label="Tipe"
            value={form.employee_type}
            onChange={(e) => setForm({ ...form, employee_type: e.target.value as EmployeeType })}
            options={[
              { value: "SUPER", label: "Supir" },
              { value: "KENEK", label: "Kenek" },
            ]}
          />
          <Input label="No. HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select
            label="Jalur"
            value={form.route}
            onChange={(e) => setForm({ ...form, route: e.target.value })}
            options={shipping_routes.map((r) => ({ value: r.name, label: r.name }))}
            placeholder="Pilih jalur"
          />
        </div>
      </Modal>

      {/* Modal Jalur */}
      <Modal
        open={showRoute}
        onClose={() => setShowRoute(false)}
        title={routeEditing ? "Edit Jalur" : "Tambah Jalur"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRoute(false)}>Batal</Button>
            <Button disabled={!routeForm.name} onClick={saveRoute}>{routeEditing ? "Simpan" : "Tambah"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nama Jalur" value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} placeholder="mis. Jalur Timur/Senin" />
          <Select
            label="Status"
            value={routeForm.status}
            onChange={(e) => setRouteForm({ ...routeForm, status: e.target.value as "OPEN" | "CLOSED" })}
            options={[
              { value: "OPEN", label: "Buka" },
              { value: "CLOSED", label: "Tutup" },
            ]}
          />
          {routeForm.status === "CLOSED" && (
            <Input label="Alasan Tutup" value={routeForm.closed_reason} onChange={(e) => setRouteForm({ ...routeForm, closed_reason: e.target.value })} placeholder="mis. Jalan sedang ditutup" />
          )}
        </div>
      </Modal>
    </div>
  );
}